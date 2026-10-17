import { NextRequest, NextResponse } from "next/server";
import {
  handleRecallWebhook,
  defaultMeetingRepository,
  defaultMeetingBotService,
} from "@/lib/meetings";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("recall-signature") || request.headers.get("x-recall-signature");
    const payload = JSON.parse(rawBody);

    const updated = await handleRecallWebhook(
      payload,
      signature,
      rawBody,
      defaultMeetingRepository,
      defaultMeetingBotService
    );

    return NextResponse.json({ success: true, meeting: updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
