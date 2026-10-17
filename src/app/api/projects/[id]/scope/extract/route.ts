import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultMeetingRepository } from "@/lib/meetings";
import {
  triggerScopeExtraction,
  defaultTaskDraftRepository,
  defaultLLMExtractionService,
} from "@/lib/scope";

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
    let meetingId = body.meetingId;

    if (!meetingId) {
      const meetings = await defaultMeetingRepository.listMeetingsForProject(projectId);
      const meetingWithTranscript = meetings.find((m) => !!m.transcript);
      if (!meetingWithTranscript) {
        return NextResponse.json(
          { error: "No completed meeting transcript found for this project." },
          { status: 400 }
        );
      }
      meetingId = meetingWithTranscript.id;
    }

    const drafts = await triggerScopeExtraction(
      meetingId,
      session.userId,
      defaultUserRepository,
      defaultMeetingRepository,
      defaultProjectRepository,
      defaultTaskDraftRepository,
      defaultLLMExtractionService
    );

    return NextResponse.json({ drafts }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
