import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import {
  confirmClientScopeItems,
  defaultTaskDraftRepository,
} from "@/lib/scope";
import { defaultLinearService } from "@/lib/linear";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized: Client session required." }, { status: 401 });
  }

  const { id: projectId } = await params;

  try {
    const body = await request.json();
    const decisions = body.decisions; // Array<{ draftId: string, approved: boolean }>

    if (!Array.isArray(decisions) || decisions.length === 0) {
      return NextResponse.json(
        { error: "Decisions array is required." },
        { status: 400 }
      );
    }

    const result = await confirmClientScopeItems(
      projectId,
      session.userId,
      decisions,
      defaultUserRepository,
      defaultProjectRepository,
      defaultTaskDraftRepository,
      defaultLinearService
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
