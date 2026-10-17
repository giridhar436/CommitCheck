import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultTaskDraftRepository } from "@/lib/scope";
import { defaultLinearService, publishProjectToLinear } from "@/lib/linear";
import { defaultEmailService } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await publishProjectToLinear(
      {
        projectId,
        freelancerId: session.userId,
        teamId: body.teamId,
        appBaseUrl: request.nextUrl.origin,
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
