export type MeetingStatus =
  | "SCHEDULED"
  | "JOINING"
  | "RECORDING"
  | "TRANSCRIBING"
  | "COMPLETED"
  | "FAILED";

export interface TranscriptSegment {
  speaker: string;
  words: string;
  startTime: number;
  endTime: number;
}

export interface Meeting {
  id: string;
  projectId: string;
  meetUrl: string;
  recallBotId: string | null;
  status: MeetingStatus;
  transcript: string | null;
  transcriptJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingBotService {
  dispatchBot(meetUrl: string, botName?: string): Promise<{ botId: string; status: MeetingStatus }>;
  getBotStatus(botId: string): Promise<{ status: MeetingStatus; segments?: TranscriptSegment[] }>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}

export interface MeetingRepository {
  createMeeting(
    projectId: string,
    meetUrl: string,
    recallBotId?: string | null,
    status?: MeetingStatus
  ): Promise<Meeting>;
  findMeetingById(id: string): Promise<Meeting | null>;
  findMeetingByRecallBotId(recallBotId: string): Promise<Meeting | null>;
  listMeetingsForProject(projectId: string): Promise<Meeting[]>;
  updateMeetingStatus(
    meetingId: string,
    status: MeetingStatus,
    transcript?: string | null,
    transcriptJson?: string | null
  ): Promise<Meeting>;
}
