import { UserRepository } from "../auth/types";
import { LinearService, LinearTeam, LinearWorkspace } from "./types";
import { ProjectRepository } from "../projects/types";
import { TaskDraftRepository } from "../scope/types";
import { EmailNotificationService } from "../notifications/types";

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

export interface PublishProjectToLinearInput {
  projectId: string;
  freelancerId: string;
  teamId?: string;
  appBaseUrl?: string;
}

export interface PublishProjectToLinearResult {
  linearProjectId: string;
  linearProjectUrl: string;
  linearTeamId: string;
  publishedIssuesCount: number;
  publishedIssues: Array<{ id: string; identifier: string; title: string; url: string }>;
  emailNotificationSent: boolean;
}

export async function publishProjectToLinear(
  input: PublishProjectToLinearInput,
  userRepo: UserRepository,
  projectRepo: ProjectRepository,
  draftRepo: TaskDraftRepository,
  linearService: LinearService,
  emailService: EmailNotificationService
): Promise<PublishProjectToLinearResult> {
  // 1. Verify user & role
  const user = await userRepo.findById(input.freelancerId);
  if (!user || user.role !== "FREELANCER") {
    throw new Error("Only users with the FREELANCER role can publish projects to Linear.");
  }

  // 2. Verify Linear credentials
  if (!user.linearAccessToken) {
    throw new Error(
      "Linear workspace not connected. Please connect your Linear account in settings before publishing."
    );
  }

  // 3. Verify project ownership
  const project = await projectRepo.findProjectById(input.projectId);
  if (!project || project.freelancerId !== input.freelancerId) {
    throw new Error("Unauthorized: You do not own this project.");
  }

  // 4. Fetch approved drafts
  const allDrafts = await draftRepo.listDraftsForProject(input.projectId);
  const approvedDrafts = allDrafts.filter(
    (d) => d.status === "APPROVED" || d.status === "DRAFT"
  );
  if (approvedDrafts.length === 0) {
    throw new Error(
      "No approved scope items to publish. Please review and approve deliverables before publishing."
    );
  }

  // 5. Select Linear team
  let teamId = input.teamId;
  if (!teamId) {
    const teams = await linearService.listTeams(user.linearAccessToken);
    if (!teams || teams.length === 0) {
      throw new Error("No teams found in your Linear workspace.");
    }
    teamId = teams[0].id;
  }

  // 6. Create Linear Project
  const createdProj = await linearService.createProject(user.linearAccessToken, {
    name: project.title,
    teamIds: [teamId],
    description: project.description || `CommitCheck verified scope for ${project.title}`,
  });

  // 7. Publish each approved deliverable as an issue
  const publishedIssues: Array<{ id: string; identifier: string; title: string; url: string }> = [];
  for (const draft of approvedDrafts) {
    const issue = await linearService.createIssue(user.linearAccessToken, {
      teamId,
      projectId: createdProj.id,
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      estimate: draft.estimate ?? undefined,
    });

    await draftRepo.updateTaskDraft(draft.id, {
      status: "SYNCED",
      linearIssueId: issue.id,
      linearIssueKey: issue.identifier,
      linearIssueUrl: issue.url,
    });

    publishedIssues.push(issue);
  }

  // 8. Update Project model
  await projectRepo.updateLinearProject(project.id, {
    linearProjectId: createdProj.id,
    linearProjectUrl: createdProj.url,
    linearTeamId: teamId,
  });

  // 9. Dispatch Resend notification email
  const baseUrl = input.appBaseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const portalUrl = `${baseUrl}/client`;
  const recipients: string[] = [];
  if (project.clientEmail) recipients.push(project.clientEmail);
  if (user.email && !recipients.includes(user.email)) recipients.push(user.email);

  let emailSent = false;
  if (recipients.length > 0) {
    try {
      const emailRes = await emailService.sendScopeApprovedEmail({
        to: recipients,
        projectName: project.title,
        linearProjectUrl: createdProj.url,
        milestoneSummary: `${publishedIssues.length} deliverables committed and scheduled for delivery under Linear project "${createdProj.name}".`,
        portalUrl,
        tasks: approvedDrafts.map((d) => ({
          title: d.title,
          priority: d.priority,
          estimate: d.estimate,
        })),
      });
      emailSent = emailRes.success;
    } catch {
      // Don't fail the sync if email dispatch encounters network issues
      emailSent = false;
    }
  }

  return {
    linearProjectId: createdProj.id,
    linearProjectUrl: createdProj.url,
    linearTeamId: teamId,
    publishedIssuesCount: publishedIssues.length,
    publishedIssues,
    emailNotificationSent: emailSent,
  };
}
