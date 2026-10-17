export * from "./types";
export * from "./adapter";
export * from "./recall";
export * from "./service";

import { PrismaMeetingRepository } from "./adapter";
import { RecallAiBotService } from "./recall";

export const defaultMeetingRepository = new PrismaMeetingRepository();
export const defaultMeetingBotService = new RecallAiBotService();
