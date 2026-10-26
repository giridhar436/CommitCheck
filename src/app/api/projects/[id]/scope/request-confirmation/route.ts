import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import {
  requestClientScopeConfirmation,
  defaultTaskDraftRepository,
} from "@/lib/scope";
import { defaultEmailService } from "@/lib/notifications";
import { getAppBaseUrl } from "@/lib/env";

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
    const origin = getAppBaseUrl(request.nextUrl.origin);

    const result = await requestClientScopeConfirmation(
      projectId,
      session.userId,
      defaultUserRepository,
      defaultProjectRepository,
      defaultTaskDraftRepository,
      defaultEmailService,
      origin
    );

    if (!result.emailSent) {
      return NextResponse.json(
        {
          error: result.message,
          ...result,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
