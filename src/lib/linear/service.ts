import { UserRepository } from "../auth/types";
import { LinearService, LinearTeam, LinearWorkspace } from "./types";

export interface ConnectLinearResult {
  workspace: LinearWorkspace;
  teams: LinearTeam[];
}

export async function connectLinearWorkspace(
  freelancerId: string,
  code: string,
  redirectUri: string,
  userRepo: UserRepository,
  linearService: LinearService
): Promise<ConnectLinearResult> {
  const user = await userRepo.findById(freelancerId);
  if (!user) {
    throw new Error("Freelancer user not found");
  }
  if (user.role !== "FREELANCER") {
    throw new Error("Only users with the FREELANCER role can connect a Linear workspace");
  }

  // 1. Exchange code for access token
  const tokenData = await linearService.exchangeCodeForToken(code, redirectUri);
  const accessToken = tokenData.access_token;

  // 2. Fetch workspace organization and teams
  const workspace = await linearService.getViewerWorkspace(accessToken);
  const teams = await linearService.listTeams(accessToken);

  // 3. Persist tokens and workspace identity on user model
  await userRepo.updateLinearCredentials(freelancerId, {
    linearAccessToken: accessToken,
    linearRefreshToken: tokenData.refresh_token || null,
    linearWorkspaceId: workspace.id,
    linearWorkspaceName: workspace.name,
  });

  return { workspace, teams };
}

export async function disconnectLinearWorkspace(
  freelancerId: string,
  userRepo: UserRepository
): Promise<void> {
  const user = await userRepo.findById(freelancerId);
  if (!user) {
    throw new Error("User not found");
  }

  await userRepo.updateLinearCredentials(freelancerId, {
    linearAccessToken: null,
    linearRefreshToken: null,
    linearWorkspaceId: null,
    linearWorkspaceName: null,
  });
}

export async function verifyLinearConnection(
  freelancerId: string,
  userRepo: UserRepository,
  linearService: LinearService
): Promise<{ connected: boolean; workspace?: LinearWorkspace; teams?: LinearTeam[] }> {
  const user = await userRepo.findById(freelancerId);
  if (!user || !user.linearAccessToken) {
    return { connected: false };
  }

  try {
    const workspace = await linearService.getViewerWorkspace(user.linearAccessToken);
    const teams = await linearService.listTeams(user.linearAccessToken);
    return {
      connected: true,
      workspace,
      teams,
    };
  } catch {
    return { connected: false };
  }
}
