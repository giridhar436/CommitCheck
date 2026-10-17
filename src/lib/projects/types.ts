export interface Project {
  id: string;
  name: string;
  title: string;
  description: string | null;
  clientEmail: string | null;
  githubRepo: string;
  githubRepoFullName: string;
  status: string;
  linearProjectId: string | null;
  freelancerId: string;
  clientId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  title: string;
  description?: string | null;
  clientEmail: string;
  githubRepoFullName: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  description: string | null;
  defaultBranch: string;
  htmlUrl: string;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

export interface GitHubService {
  listUserRepositories(accessToken: string): Promise<GitHubRepository[]>;
  verifyRepositoryAccess(accessToken: string, repoFullName: string): Promise<boolean>;
}

export interface ProjectRepository {
  createProject(freelancerId: string, input: CreateProjectInput, clientId?: string | null): Promise<Project>;
  findProjectById(id: string): Promise<Project | null>;
  listProjectsForFreelancer(freelancerId: string): Promise<Project[]>;
  listProjectsForClient(clientEmail: string): Promise<Project[]>;
}
