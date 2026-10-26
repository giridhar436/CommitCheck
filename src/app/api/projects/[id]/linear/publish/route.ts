import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultTaskDraftRepository } from "@/lib/scope";
import { defaultLinearService, publishProjectToLinear } from "@/lib/linear";
import { defaultEmailService } from "@/lib/notifications";
import { getAppBaseUrl } from "@/lib/env";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json({ error: "Unauthorized: Freelancer session required." }, { status: 401 });
  }

  const { id: projectId } = await params;

  // 1. Verify project ownership before proceeding
  const project = await defaultProjectRepository.findProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (project.freelancerId !== session.userId) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to publish this project." },
      { status: 403 }
    );
  }

  // 2. Verify freelancer has connected their Linear workspace
  const user = await defaultUserRepository.findById(session.userId);
  if (!user?.linearAccessToken) {
    return NextResponse.json(
      {
        error:
          "Linear workspace not connected. Please connect your Linear account in settings before publishing.",
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await publishProjectToLinear(
      {
        projectId,
        freelancerId: session.userId,
        teamId: body.teamId,
        appBaseUrl: getAppBaseUrl(request.nextUrl.origin),
      },
      defaultUserRepository,
      defaultProjectRepository,
      defaultTaskDraftRepository,
      defaultLinearService,
      defaultEmailService
    );

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
