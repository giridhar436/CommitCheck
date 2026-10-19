import { NextRequest, NextResponse } from "next/server";
import {
  handleRecallWebhook,
  defaultMeetingRepository,
  defaultMeetingBotService,
} from "@/lib/meetings";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    // Recall.ai signs via Svix (svix-id / svix-timestamp / svix-signature headers)
    const headers = Object.fromEntries(request.headers) as Record<string, string>;
    const payload = JSON.parse(rawBody);

    const updated = await handleRecallWebhook(
      payload,
      headers,
      rawBody,
      defaultMeetingRepository,
      defaultMeetingBotService
    );

    return NextResponse.json({ success: true, meeting: updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
