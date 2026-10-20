import {
  CreateLinearIssueInput,
  CreateLinearProjectInput,
  LinearCreatedIssue,
  LinearCreatedProject,
  LinearProjectIssue,
  LinearOAuthTokenResponse,
  LinearService,
  LinearTeam,
  LinearWorkspace,
} from "./types";

export class LiveLinearService implements LinearService {
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const clientId = process.env.LINEAR_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "read,write,issues:create",
      actor: "user",
      ...(state ? { state } : {}),
    });
    return `https://linear.app/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<LinearOAuthTokenResponse> {
    const clientId = process.env.LINEAR_CLIENT_ID;
    const clientSecret = process.env.LINEAR_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId.startsWith("mock_")) {
      return {
        access_token: "lin_mock_token_dev_123",
        token_type: "Bearer",
        scope: ["read", "write", "issues:create"],
        refresh_token: "lin_mock_refresh_token_dev_123",
      };
    }

    const res = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Linear OAuth error (${res.status}): ${errText}`);
    }

    return res.json();
  }

  async getViewerWorkspace(accessToken: string): Promise<LinearWorkspace> {
    if (!accessToken || accessToken.startsWith("lin_mock_")) {
      return {
        id: "ws_demo_linear_1",
        name: "Acme Freelance Studio",
        urlKey: "acme-studio",
      };
    }

    const query = `
      query {
        viewer {
          id
          organization {
            id
            name
            urlKey
          }
        }
      }
    `;

    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Linear workspace (${res.status})`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      const msg = json.errors.map((e: any) => e.message).join(", ");
      throw new Error(`Linear GraphQL error fetching workspace: ${msg}`);
    }
    const org = json.data?.viewer?.organization;
    if (!org) {
      throw new Error("No organization found in Linear profile");
    }

    return {
      id: org.id,
      name: org.name,
      urlKey: org.urlKey,
    };
  }

  async listTeams(accessToken: string): Promise<LinearTeam[]> {
    if (!accessToken || accessToken.startsWith("lin_mock_")) {
      return [
        { id: "team_1", name: "Engineering", key: "ENG" },
        { id: "team_2", name: "Product Design", key: "DES" },
      ];
    }

    const query = `
      query {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;

    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      throw new Error(`Failed to list Linear teams (${res.status})`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      const msg = json.errors.map((e: any) => e.message).join(", ");
      throw new Error(`Linear GraphQL error listing teams: ${msg}`);
    }
    return json.data?.teams?.nodes || [];
  }

  async createProject(
    accessToken: string,
    input: CreateLinearProjectInput
  ): Promise<LinearCreatedProject> {
    if (!accessToken || accessToken.startsWith("lin_mock_")) {
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      return {
        id: `lin_proj_${Math.random().toString(36).substring(2, 9)}`,
        name: input.name,
        url: `https://linear.app/freelance-agency/project/${slug}`,
        slugId: slug,
      };
    }

    const mutation = `
      mutation CreateProject($name: String!, $teamIds: [String!]!, $description: String) {
        projectCreate(input: { name: $name, teamIds: $teamIds, description: $description }) {
          success
          project {
            id
            name
            url
            slugId
          }
        }
      }
    `;

    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          name: input.name,
          teamIds: input.teamIds,
          description: input.description,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create Linear project (${res.status})`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      const msg = json.errors.map((e: any) => e.message).join(", ");
      throw new Error(`Linear GraphQL error creating project: ${msg}`);
    }
    const proj = json.data?.projectCreate?.project;
    if (!proj || json.data?.projectCreate?.success === false) {
      throw new Error("Linear project creation failed: No project returned");
    }

    return proj;
  }

  async createIssue(
    accessToken: string,
    input: CreateLinearIssueInput
  ): Promise<LinearCreatedIssue> {
    if (!accessToken || accessToken.startsWith("lin_mock_")) {
      const num = Math.floor(100 + Math.random() * 900);
      const identifier = `DEV-${num}`;
      return {
        id: `lin_issue_${Math.random().toString(36).substring(2, 9)}`,
        identifier,
        title: input.title,
        url: `https://linear.app/freelance-agency/issue/${identifier}`,
      };
    }

    const mutation = `
      mutation CreateIssue(
        $teamId: String!
        $projectId: String
        $title: String!
        $description: String
        $priority: Int
        $estimate: Int
      ) {
        issueCreate(
          input: {
            teamId: $teamId
            projectId: $projectId
            title: $title
            description: $description
            priority: $priority
            estimate: $estimate
          }
        ) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
    `;

    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          teamId: input.teamId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          estimate: input.estimate,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create Linear issue (${res.status})`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      const msg = json.errors.map((e: any) => e.message).join(", ");
      throw new Error(`Linear GraphQL error creating issue: ${msg}`);
    }
    const issue = json.data?.issueCreate?.issue;
    if (!issue || json.data?.issueCreate?.success === false) {
      throw new Error("Linear issue creation failed: No issue returned");
    }

    return issue;
  }

  async fetchProjectIssues(
    accessToken: string,
    projectId: string
  ): Promise<LinearProjectIssue[]> {
    if (!accessToken || accessToken.startsWith("lin_mock_")) {
      return [
        {
          id: "issue_mock_1",
          identifier: "DEV-101",
          title: "Implement Biometric FaceID Flow",
          description: "Support local iOS FaceID authentication",
          status: "Done",
          statusType: "completed",
          priority: 1,
          estimate: 5,
        },
        {
          id: "issue_mock_2",
          identifier: "DEV-102",
          title: "Configure Stripe Customer Portal",
          description: "Embed customer billing portal for subscription upgrades",
          status: "In Progress",
          statusType: "started",
          priority: 2,
          estimate: 3,
        },
      ];
    }

    const query = `
      query ProjectIssues($projectId: String!) {
        project(id: $projectId) {
          issues {
            nodes {
              id
              identifier
              title
              description
              priority
              estimate
              state {
                id
                name
                type
              }
            }
          }
        }
      }
    `;

    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query,
        variables: { projectId },
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Linear project issues (${res.status})`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      const msg = json.errors.map((e: any) => e.message).join(", ");
      throw new Error(`Linear GraphQL error fetching project issues: ${msg}`);
    }

    const nodes = json.data?.project?.issues?.nodes || [];
    return nodes.map((node: any) => ({
      id: node.id,
      identifier: node.identifier,
      title: node.title,
      description: node.description || "",
      status: node.state?.name || "Todo",
      statusType: node.state?.type || "unstarted",
      priority: node.priority,
      estimate: node.estimate,
    }));
  }
}

interface GitHubLinearService extends LinearService {}

export class MockLinearService implements LinearService {
  public simulateGraphQLError: string | null = null;
  private workspace: LinearWorkspace;
  private teams: LinearTeam[];

  constructor(
    workspace: LinearWorkspace = {
      id: "ws_mock_linear_99",
      name: "Freelance Agency Hub",
      urlKey: "freelance-agency",
    },
    teams: LinearTeam[] = [
      { id: "team_dev", name: "Development", key: "DEV" },
      { id: "team_ops", name: "Operations", key: "OPS" },
    ]
  ) {
    this.workspace = workspace;
    this.teams = teams;
  }

  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: "mock_linear_client",
      redirect_uri: redirectUri,
      ...(state ? { state } : {}),
    });
    return `https://linear.app/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, _redirectUri: string): Promise<LinearOAuthTokenResponse> {
    if (code === "invalid_code") {
      throw new Error("Invalid or expired authorization code");
    }
    return {
      access_token: `lin_token_${code}`,
      token_type: "Bearer",
      scope: ["read", "write", "issues:create"],
      refresh_token: `lin_refresh_${code}`,
    };
  }

  async getViewerWorkspace(accessToken: string): Promise<LinearWorkspace> {
    if (this.simulateGraphQLError) {
      throw new Error(`Linear GraphQL error: ${this.simulateGraphQLError}`);
    }
    if (!accessToken || accessToken === "invalid_token") {
      throw new Error("Authentication failed: invalid token");
    }
    return { ...this.workspace };
  }

  async listTeams(accessToken: string): Promise<LinearTeam[]> {
    if (this.simulateGraphQLError) {
      throw new Error(`Linear GraphQL error: ${this.simulateGraphQLError}`);
    }
    if (!accessToken || accessToken === "invalid_token") {
      throw new Error("Authentication failed: invalid token");
    }
    return [...this.teams];
  }

  async createProject(
    accessToken: string,
    input: CreateLinearProjectInput
  ): Promise<LinearCreatedProject> {
    if (this.simulateGraphQLError) {
      throw new Error(`Linear GraphQL error: ${this.simulateGraphQLError}`);
    }
    if (!accessToken || accessToken === "invalid_token") {
      throw new Error("Authentication failed: invalid token");
    }
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return {
      id: `lin_proj_${Math.random().toString(36).substring(2, 9)}`,
      name: input.name,
      url: `https://linear.app/${this.workspace.urlKey || "freelance-agency"}/project/${slug}`,
      slugId: slug,
    };
  }

  public createdIssues: LinearCreatedIssue[] = [];

  async createIssue(
    accessToken: string,
    input: CreateLinearIssueInput
  ): Promise<LinearCreatedIssue> {
    if (this.simulateGraphQLError) {
      throw new Error(`Linear GraphQL error: ${this.simulateGraphQLError}`);
    }
    if (!accessToken || accessToken === "invalid_token") {
      throw new Error("Authentication failed: invalid token");
    }
    const team = this.teams.find((t) => t.id === input.teamId) || this.teams[0] || { key: "DEV" };
    const num = Math.floor(100 + Math.random() * 900);
    const identifier = `${team.key}-${num}`;
    const issue: LinearCreatedIssue = {
      id: `lin_issue_${Math.random().toString(36).substring(2, 9)}`,
      identifier,
      title: input.title,
      url: `https://linear.app/${this.workspace.urlKey || "freelance-agency"}/issue/${identifier}`,
    };
    this.createdIssues.push(issue);
    return issue;
  }

  public projectIssues: LinearProjectIssue[] = [];

  async fetchProjectIssues(
    accessToken: string,
    _projectId: string
  ): Promise<LinearProjectIssue[]> {
    if (this.simulateGraphQLError) {
      throw new Error(`Linear GraphQL error: ${this.simulateGraphQLError}`);
    }
    if (!accessToken || accessToken === "invalid_token") {
      throw new Error("Authentication failed: invalid token");
    }
    if (this.projectIssues.length > 0) {
      return [...this.projectIssues];
    }
    if (this.createdIssues.length > 0) {
      return this.createdIssues.map((ci) => ({
        id: ci.id,
        identifier: ci.identifier,
        title: ci.title,
        status: "Done",
        statusType: "completed",
      }));
    }
    return [
      {
        id: "mock_iss_1",
        identifier: "DEV-101",
        title: "Implement Biometric FaceID Flow",
        description: "Support local iOS FaceID authentication",
        status: "Done",
        statusType: "completed",
        priority: 1,
        estimate: 5,
      },
      {
        id: "mock_iss_2",
        identifier: "DEV-102",
        title: "Configure Stripe Customer Portal",
        description: "Embed customer billing portal for subscription upgrades",
        status: "In Progress",
        statusType: "started",
        priority: 2,
        estimate: 3,
      },
    ];
  }
}
