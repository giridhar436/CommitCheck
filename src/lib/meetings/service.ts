import { UserRepository } from "../auth/types";
import { ProjectRepository } from "../projects/types";
import {
  Meeting,
  MeetingBotService,
  MeetingRepository,
  MeetingStatus,
  TranscriptSegment,
} from "./types";

const GOOGLE_MEET_REGEX = /^https:\/\/meet\.google\.com\/[a-z0-9\-]+$/i;

export async function dispatchMeetingBot(
  projectId: string,
  meetUrl: string,
  freelancerId: string,
  userRepo: UserRepository,
  projectRepo: ProjectRepository,
  meetingRepo: MeetingRepository,
  botService: MeetingBotService
): Promise<Meeting> {
  // 1. Verify freelancer exists and has role
  const user = await userRepo.findById(freelancerId);
  if (!user || user.role !== "FREELANCER") {
    throw new Error("Only users with the FREELANCER role can dispatch meeting bots.");
  }

  // 2. Verify project ownership
  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  if (project.freelancerId !== freelancerId) {
    throw new Error("Unauthorized: You do not own this project.");
  }

  // 3. Validate Google Meet URL
  const trimmedUrl = meetUrl.trim();
  if (!trimmedUrl || !GOOGLE_MEET_REGEX.test(trimmedUrl)) {
    throw new Error("Invalid Google Meet URL. Must match format 'https://meet.google.com/xxx-yyyy-zzz'.");
  }

  // 4. Dispatch Recall.ai Bot
  const { botId, status } = await botService.dispatchBot(trimmedUrl, "CommitCheck Notetaker");

  // 5. Store meeting record
  return meetingRepo.createMeeting(projectId, trimmedUrl, botId, status);
}

export function formatTranscriptSegments(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const minutes = Math.floor(s.startTime / 60);
      const seconds = Math.floor(s.startTime % 60);
      const timeStr = `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}]`;
      return `${timeStr} ${s.speaker}: ${s.words}`;
    })
    .join("\n\n");
}

export async function handleRecallWebhook(
  payload: any,
  signatureHeader: string | null,
  rawBody: string,
  meetingRepo: MeetingRepository,
  botService: MeetingBotService
): Promise<Meeting | null> {
  // 1. Verify webhook signature
  const isValid = botService.verifyWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    throw new Error("Invalid webhook signature from Recall.ai");
  }

  const botId = payload?.data?.bot_id || payload?.bot_id || payload?.data?.id;
  if (!botId) {
    throw new Error("Missing bot_id in webhook payload");
  }

  // 2. Find meeting associated with this Recall bot
  const meeting = await meetingRepo.findMeetingByRecallBotId(botId);
  if (!meeting) {
    return null; // Meeting may belong to another environment
  }

  // 3. Map status and extract transcript
  const event = payload.event || payload.type;
  let newStatus: MeetingStatus = meeting.status;
  let transcriptText: string | null = null;
  let transcriptJson: string | null = null;

  if (event === "bot.status_change") {
    const code = payload?.data?.status?.code;
    if (code === "in_call_not_recording" || code === "joining_call") {
      newStatus = "JOINING";
    } else if (code === "in_call_recording") {
      newStatus = "RECORDING";
    } else if (code === "done") {
      newStatus = "TRANSCRIBING";
    } else if (code === "fatal") {
      newStatus = "FAILED";
    }
  }

  if (event === "transcript.done" || payload?.data?.transcript || payload?.transcript) {
    const rawSegments =
      payload?.data?.transcript ||
      payload?.transcript ||
      payload?.data?.segments ||
      [];

    const segments: TranscriptSegment[] = Array.isArray(rawSegments)
      ? rawSegments.map((seg: any) => ({
          speaker: seg.speaker || "Participant",
          words: seg.words || seg.text || "",
          startTime: seg.start_time ?? seg.startTime ?? 0,
          endTime: seg.end_time ?? seg.endTime ?? 0,
        }))
      : [];

    if (segments.length > 0) {
      transcriptText = formatTranscriptSegments(segments);
      transcriptJson = JSON.stringify(segments);
      newStatus = "COMPLETED";
    }
  }

  return meetingRepo.updateMeetingStatus(
    meeting.id,
    newStatus,
    transcriptText,
    transcriptJson
  );
}
