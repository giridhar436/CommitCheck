import { GitHubRepository, GitHubService } from "./types";

export class LiveGitHubService implements GitHubService {
  async listUserRepositories(accessToken: string): Promise<GitHubRepository[]> {
    if (!accessToken || accessToken.startsWith("mock_")) {
      return this.getMockRepositories();
    }

    try {
      const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CommitCheck-App",
        },
      });

      if (!res.ok) {
        throw new Error(`GitHub API error (${res.status}): failed to list repositories`);
      }

      const repos = await res.json();
      return repos.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner?.login || "",
        isPrivate: Boolean(r.private),
        description: r.description || null,
        defaultBranch: r.default_branch || "main",
        htmlUrl: r.html_url,
        permissions: r.permissions,
      }));
    } catch {
      // Fallback to mock for seamless development experience
      return this.getMockRepositories();
    }
  }

  async verifyRepositoryAccess(accessToken: string, repoFullName: string): Promise<boolean> {
    if (!accessToken || accessToken.startsWith("mock_")) {
      return true;
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${repoFullName}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CommitCheck-App",
        },
      });

      return res.status === 200;
    } catch {
      return false;
    }
  }

  private getMockRepositories(): GitHubRepository[] {
    return [
      {
        id: 101,
        name: "ecommerce-redesign",
        fullName: "alex-rivera-dev/ecommerce-redesign",
        owner: "alex-rivera-dev",
        isPrivate: false,
        description: "Next.js & Stripe store checkout flow overhaul",
        defaultBranch: "main",
        htmlUrl: "https://github.com/alex-rivera-dev/ecommerce-redesign",
        permissions: { admin: true, push: true, pull: true },
      },
      {
        id: 102,
        name: "mobile-banking-api",
        fullName: "alex-rivera-dev/mobile-banking-api",
        owner: "alex-rivera-dev",
        isPrivate: true,
        description: "FastAPI microservices for card authorization",
        defaultBranch: "main",
        htmlUrl: "https://github.com/alex-rivera-dev/mobile-banking-api",
        permissions: { admin: true, push: true, pull: true },
      },
      {
        id: 103,
        name: "analytics-pipeline",
        fullName: "clientcorp/analytics-pipeline",
        owner: "clientcorp",
        isPrivate: true,
        description: "Postgres event streaming with Kafka",
        defaultBranch: "main",
        htmlUrl: "https://github.com/clientcorp/analytics-pipeline",
        permissions: { admin: false, push: true, pull: true },
      },
    ];
  }
}

export class MockGitHubService implements GitHubService {
  private repos: GitHubRepository[] = [];
  private accessibleRepos: Set<string> = new Set();

  constructor(initialRepos?: GitHubRepository[]) {
    if (initialRepos) {
      this.repos = initialRepos;
      for (const r of initialRepos) {
        this.accessibleRepos.add(r.fullName.toLowerCase());
      }
    } else {
      const defaults: GitHubRepository[] = [
        {
          id: 1,
          name: "saas-starter",
          fullName: "freelancer/saas-starter",
          owner: "freelancer",
          isPrivate: false,
          description: "Full stack TypeScript starter",
          defaultBranch: "main",
          htmlUrl: "https://github.com/freelancer/saas-starter",
          permissions: { admin: true, push: true, pull: true },
        },
        {
          id: 2,
          name: "crm-integration",
          fullName: "client-org/crm-integration",
          owner: "client-org",
          isPrivate: true,
          description: "Salesforce bidirectional sync",
          defaultBranch: "main",
          htmlUrl: "https://github.com/client-org/crm-integration",
          permissions: { admin: false, push: true, pull: true },
        },
      ];
      this.repos = defaults;
      for (const r of defaults) {
        this.accessibleRepos.add(r.fullName.toLowerCase());
      }
    }
  }

  async listUserRepositories(_accessToken: string): Promise<GitHubRepository[]> {
    return [...this.repos];
  }

  async verifyRepositoryAccess(_accessToken: string, repoFullName: string): Promise<boolean> {
    return this.accessibleRepos.has(repoFullName.toLowerCase());
  }

  addRepository(repo: GitHubRepository) {
    this.repos.push(repo);
    this.accessibleRepos.add(repo.fullName.toLowerCase());
  }
}
