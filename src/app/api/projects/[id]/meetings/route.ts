import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import {
  dispatchMeetingBot,
  defaultMeetingRepository,
  defaultMeetingBotService,
  handleRecallWebhook,
  reconcileProjectMeetings,
} from "@/lib/meetings";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const meetings = await reconcileProjectMeetings(
      id,
      defaultMeetingRepository,
      defaultMeetingBotService
    );
    return NextResponse.json({ meetings });
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

  const { id } = await params;
  try {
    const body = await request.json();
    const meetUrl = body.meetUrl;
    const autoSimulate = body.autoSimulate !== false;

    const meeting = await dispatchMeetingBot(
      id,
      meetUrl,
      session.userId,
      defaultUserRepository,
      defaultProjectRepository,
      defaultMeetingRepository,
      defaultMeetingBotService
    );

    // In local dev/testing without active Recall API keys, simulate transcript completion
    if (
      autoSimulate &&
      (!process.env.RECALL_AI_API_KEY || process.env.RECALL_AI_API_KEY.startsWith("mock_"))
    ) {
      setTimeout(async () => {
        const simPayload = {
          event: "transcript.done",
          data: {
            bot_id: meeting.recallBotId,
            transcript: [
              {
                speaker: "Elena (Client)",
                words: "Hi Alex! As discussed, we need three key things for our store release: Stripe Elements checkout, receipt notification webhooks, and unit test coverage for payments.",
                start_time: 2.0,
                end_time: 12.5,
              },
              {
                speaker: "Alex (Freelancer)",
                words: "Sounds good Elena. I will set up the Stripe Elements frontend components, wire up the Resend webhook endpoint, and write unit tests.",
                start_time: 13.0,
                end_time: 21.0,
              },
              {
                speaker: "Elena (Client)",
                words: "Awesome. Once you publish those to Linear, we will track them.",
                start_time: 21.5,
                end_time: 26.0,
              },
            ],
          },
        };

        try {
          await handleRecallWebhook(
            simPayload,
            null,
            JSON.stringify(simPayload),
            defaultMeetingRepository,
            defaultMeetingBotService
          );
        } catch {
          // ignore background simulation error
        }
      }, 500);
    }

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
