import { UserRepository } from "../auth/types";
import { CreateProjectInput, GitHubService, Project, ProjectRepository } from "./types";

const REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createProjectService(
  freelancerId: string,
  input: CreateProjectInput,
  userRepo: UserRepository,
  projectRepo: ProjectRepository,
  gitHubService: GitHubService
): Promise<Project> {
  // 1. Verify freelancer exists and has FREELANCER role
  const freelancer = await userRepo.findById(freelancerId);
  if (!freelancer) {
    throw new Error("Freelancer account not found.");
  }
  if (freelancer.role !== "FREELANCER") {
    throw new Error("Only users with the FREELANCER role can initialize projects.");
  }

  // 2. Validate input fields
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Project title is required.");
  }

  const clientEmail = input.clientEmail?.trim().toLowerCase();
  if (!clientEmail || !EMAIL_REGEX.test(clientEmail)) {
    throw new Error("A valid client email address is required.");
  }

  const repoFullName = input.githubRepoFullName?.trim();
  if (!repoFullName || !REPO_REGEX.test(repoFullName)) {
    throw new Error("Invalid GitHub repository format. Must be in 'owner/repo' format.");
  }

  // 3. Verify GitHub repository access
  const accessToken = freelancer.githubAccessToken || "mock_token";
  const hasAccess = await gitHubService.verifyRepositoryAccess(accessToken, repoFullName);
  if (!hasAccess) {
    throw new Error(
      `Access denied: Your GitHub account does not have read access to repository '${repoFullName}'.`
    );
  }

  // 4. Link existing client user if already registered
  const clientUser = await userRepo.findByEmail(clientEmail);
  const clientId = clientUser && clientUser.role === "CLIENT" ? clientUser.id : null;

  // 5. Create project in repository
  return projectRepo.createProject(
    freelancerId,
    {
      title,
      description: input.description?.trim() || null,
      clientEmail,
      githubRepoFullName: repoFullName,
    },
    clientId
  );
}
