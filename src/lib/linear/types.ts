export interface LinearWorkspace {
  id: string;
  name: string;
  urlKey?: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string[];
  refresh_token?: string;
}

export interface CreateLinearProjectInput {
  name: string;
  teamIds: string[];
  description?: string;
}

export interface LinearCreatedProject {
  id: string;
  name: string;
  url: string;
  slugId?: string;
}

export interface CreateLinearIssueInput {
  teamId: string;
  projectId?: string;
  title: string;
  description?: string;
  priority?: number;
  estimate?: number;
}

export interface LinearCreatedIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
}

export interface LinearService {
  getAuthorizationUrl(redirectUri: string, state?: string): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<LinearOAuthTokenResponse>;
  getViewerWorkspace(accessToken: string): Promise<LinearWorkspace>;
  listTeams(accessToken: string): Promise<LinearTeam[]>;
  createProject(accessToken: string, input: CreateLinearProjectInput): Promise<LinearCreatedProject>;
  createIssue(accessToken: string, input: CreateLinearIssueInput): Promise<LinearCreatedIssue>;
}
