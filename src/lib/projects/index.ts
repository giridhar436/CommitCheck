export * from "./types";
export * from "./adapter";
export * from "./github";
export * from "./service";

import { PrismaProjectRepository } from "./adapter";
import { LiveGitHubService } from "./github";

export const defaultProjectRepository = new PrismaProjectRepository();
export const defaultGitHubService = new LiveGitHubService();
