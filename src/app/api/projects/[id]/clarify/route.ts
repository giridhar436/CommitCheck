import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultEmailService } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await defaultProjectRepository.findProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Ensure user is authorized for this project
  const isFreelancer = project.freelancerId === session.userId;
  const isClient =
    project.clientId === session.userId ||
    (project.clientEmail && project.clientEmail.toLowerCase() === session.email.toLowerCase());

  if (!isFreelancer && !isClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { issueKey, taskTitle, question } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Clarification question is required." }, { status: 400 });
    }

    // Get freelancer to notify
    const freelancer = await defaultUserRepository.findById(project.freelancerId);
    if (!freelancer || !freelancer.email) {
      return NextResponse.json({ error: "Freelancer contact not found." }, { status: 404 });
    }

    const appBaseUrl = request.nextUrl.origin;
    const projectPortalUrl = `${appBaseUrl}/freelancer/projects/${project.id}`;

    await defaultEmailService.sendScopeApprovedEmail({
      to: [freelancer.email],
      projectName: project.title,
      linearProjectUrl: project.linearProjectUrl || projectPortalUrl,
      milestoneSummary: `Clarification Question on ${issueKey || "Task"}: "${question.trim()}"`,
      portalUrl: projectPortalUrl,
      tasks: [
        {
          title: `${issueKey ? `[${issueKey}] ` : ""}${taskTitle || "Task"}`,
          priority: 1,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Clarification request sent to ${freelancer.email}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
