import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultTaskDraftRepository } from "@/lib/scope";
import {
  runProjectAudit,
  defaultAuditRepository,
  LiveGitHubCommitFetcher,
  GeminiSemanticDiffAnalyzer,
} from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  const auditorRole =
    session.role === "CLIENT" ? "CLIENT" : "FREELANCER_SELF_CHECK";

  try {
    const result = await runProjectAudit(
      {
        projectId,
        userId: session.userId,
        auditorRole,
        forceRefresh: force,
      },
      defaultUserRepository,
      defaultProjectRepository,
      defaultTaskDraftRepository,
      new LiveGitHubCommitFetcher(),
      new GeminiSemanticDiffAnalyzer(),
      defaultAuditRepository
    );

    return NextResponse.json(result);
  } catch (err: any) {
    const code = err.code || "GITHUB_VERIFICATION_UNAVAILABLE";
    return NextResponse.json({ error: err.message, code }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const body = await request.json().catch(() => ({}));
  const force = body.force !== false;

  const auditorRole =
    session.role === "CLIENT" ? "CLIENT" : "FREELANCER_SELF_CHECK";

  try {
    const result = await runProjectAudit(
      {
        projectId,
        userId: session.userId,
        auditorRole,
        forceRefresh: force,
      },
      defaultUserRepository,
      defaultProjectRepository,
      defaultTaskDraftRepository,
      new LiveGitHubCommitFetcher(),
      new GeminiSemanticDiffAnalyzer(),
      defaultAuditRepository
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const code = err.code || "GITHUB_VERIFICATION_UNAVAILABLE";
    return NextResponse.json({ error: err.message, code }, { status: 400 });
  }
}
