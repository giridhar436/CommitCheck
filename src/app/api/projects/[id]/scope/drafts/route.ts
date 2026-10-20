import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import {
  defaultTaskDraftRepository,
  createManualDraftTask,
  updateDraftTask,
  deleteDraftTask,
  approveAllDraftTasks,
} from "@/lib/scope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  try {
    const project = await defaultProjectRepository.findProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isFreelancer = project.freelancerId === session.userId;
    const isClient =
      project.clientId === session.userId ||
      (project.clientEmail && project.clientEmail.toLowerCase() === session.email.toLowerCase());

    if (!isFreelancer && !isClient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const drafts = await defaultTaskDraftRepository.listDraftsForProject(projectId);
    return NextResponse.json({ drafts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await defaultProjectRepository.findProjectById(projectId);
  if (!project || project.freelancerId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const draft = await createManualDraftTask(
      body.meetingId || "manual",
      projectId,
      {
        title: body.title,
        description: body.description || "",
        priority: typeof body.priority === "number" ? body.priority : 2,
        estimate: typeof body.estimate === "number" ? body.estimate : 2,
      },
      defaultTaskDraftRepository
    );

    return NextResponse.json({ draft }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await defaultProjectRepository.findProjectById(projectId);
  if (!project || project.freelancerId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.approveAll) {
      const drafts = await defaultTaskDraftRepository.listDraftsForProject(projectId);
      const updated = [];
      for (const d of drafts) {
        if (d.status === "DRAFT") {
          const res = await defaultTaskDraftRepository.updateTaskDraft(d.id, {
            status: "APPROVED",
          });
          updated.push(res);
        } else {
          updated.push(d);
        }
      }
      return NextResponse.json({ drafts: updated });
    }

    if (!body.draftId) {
      return NextResponse.json({ error: "draftId is required" }, { status: 400 });
    }

    const updated = await updateDraftTask(
      body.draftId,
      body.updates || {},
      defaultTaskDraftRepository
    );

    return NextResponse.json({ draft: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await defaultProjectRepository.findProjectById(projectId);
  if (!project || project.freelancerId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get("draftId");
    if (!draftId) {
      return NextResponse.json({ error: "draftId query parameter is required" }, { status: 400 });
    }

    await deleteDraftTask(draftId, defaultTaskDraftRepository);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
