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

// Accepts both the simulation format ({speaker, words, start_time, end_time}) and
// Recall.ai's native diarized format ({participant: {name}, words: [{text, start_timestamp: {relative}, ...}]}).
function normalizeTranscriptSegments(rawSegments: any[]): TranscriptSegment[] {
  return rawSegments
    .map((seg: any) => {
      // Recall.ai native: utterance with participant + word list
      if (Array.isArray(seg?.words) && seg.words.length > 0 && typeof seg.words[0] === "object") {
        const wordTexts = seg.words
          .map((w: any) => w?.text || "")
          .join(" ")
          .trim();
        const firstRel = seg.words[0]?.start_timestamp?.relative;
        const lastRel = seg.words[seg.words.length - 1]?.end_timestamp?.relative;
        return {
          speaker: seg?.participant?.name || "Participant",
          words: wordTexts,
          startTime: Number(firstRel) || 0,
          endTime: Number(lastRel) || 0,
        };
      }
      // Simulation format
      return {
        speaker: seg.speaker || "Participant",
        words: seg.words || seg.text || "",
        startTime: seg.start_time ?? seg.startTime ?? 0,
        endTime: seg.end_time ?? seg.endTime ?? 0,
      };
    })
    .filter((s) => s.words);
}

export async function handleRecallWebhook(
  payload: any,
  headers: Record<string, string> | null,
  rawBody: string,
  meetingRepo: MeetingRepository,
  botService: MeetingBotService
): Promise<Meeting | null> {
  // 1. Verify webhook signature
  const isValid = botService.verifyWebhookSignature(rawBody, headers);
  if (!isValid) {
    throw new Error("Invalid webhook signature from Recall.ai");
  }

  // Current Recall.ai payloads carry the bot id at data.bot.id; older/simulated formats use data.bot_id, bot_id, or data.id
  const botId = payload?.data?.bot?.id || payload?.data?.bot_id || payload?.bot_id || payload?.data?.id;
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

  if (typeof event === "string" && event.startsWith("bot.")) {
    // Current Recall.ai events (bot.joining_call, bot.in_call_recording, ...) carry the code at data.data.code;
    // the simulated format uses bot.status_change with the code at data.status.code
    const code = payload?.data?.data?.code ?? payload?.data?.status?.code;
    if (
      code === "in_call_not_recording" ||
      code === "joining_call" ||
      code === "in_waiting_room" ||
      code === "recording_permission_allowed" ||
      code === "recording_permission_denied"
    ) {
      newStatus = "JOINING";
    } else if (code === "in_call_recording") {
      newStatus = "RECORDING";
    } else if (code === "call_ended" || code === "done") {
      newStatus = "TRANSCRIBING";
    } else if (code === "fatal") {
      newStatus = "FAILED";
    }
  } else if (event === "transcript.failed") {
    newStatus = "FAILED";
  }

  if (event === "transcript.done" || payload?.data?.transcript || payload?.transcript) {
    const transcriptField =
      payload?.data?.transcript || payload?.transcript || payload?.data?.segments;

    let segments: TranscriptSegment[] = [];
    if (Array.isArray(transcriptField)) {
      // Inline transcript (simulation format)
      segments = normalizeTranscriptSegments(transcriptField);
    } else if (
      transcriptField &&
      typeof transcriptField === "object" &&
      (transcriptField as { id?: string }).id
    ) {
      // Current Recall.ai transcript.done notifications only reference the artifact;
      // the utterances must be fetched from the artifact's presigned download URL
      const transcriptData = await botService.fetchTranscriptArtifact(
        (transcriptField as { id: string }).id
      );
      if (Array.isArray(transcriptData)) {
        segments = normalizeTranscriptSegments(transcriptData);
      }
    }

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
