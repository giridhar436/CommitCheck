import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  connectLinearWorkspace,
  disconnectLinearWorkspace,
  verifyLinearConnection,
} from "./service";
import { MockLinearService, LiveLinearService } from "./linear";
import { InMemoryUserRepository } from "../auth/adapter";

describe("CommitCheck Freelancer Linear OAuth & Workspace Connection (VAR-8 / VAR-19)", () => {
  let userRepo: InMemoryUserRepository;
  let linearService: MockLinearService;
  let freelancerId: string;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    linearService = new MockLinearService({
      id: "ws_varun_bhat",
      name: "Varun's Linear Workspace",
      urlKey: "varun-v-bhat",
    }, [
      { id: "team_var", name: "Varun v bhat", key: "VAR" },
      { id: "team_eng", name: "Engineering", key: "ENG" },
    ]);

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_freelancer_77",
        email: "freelancer@dev.org",
        name: "Dev Freelancer",
      },
      "FREELANCER"
    );
    freelancerId = freelancer.id;
  });

  it("successfully connects Linear workspace, stores credentials, and retrieves teams", async () => {
    const result = await connectLinearWorkspace(
      freelancerId,
      "valid_auth_code_123",
      "http://localhost:3000/api/auth/linear/callback",
      userRepo,
      linearService
    );

    assert.equal(result.workspace.id, "ws_varun_bhat");
    assert.equal(result.workspace.name, "Varun's Linear Workspace");
    assert.equal(result.teams.length, 2);
    assert.equal(result.teams[0].key, "VAR");

    // Verify stored on user model including refresh token
    const user = await userRepo.findById(freelancerId);
    assert.equal(user?.linearAccessToken, "lin_token_valid_auth_code_123");
    assert.equal(user?.linearRefreshToken, "lin_refresh_valid_auth_code_123");
    assert.equal(user?.linearWorkspaceId, "ws_varun_bhat");
    assert.equal(user?.linearWorkspaceName, "Varun's Linear Workspace");

    // Verify status helper
    const status = await verifyLinearConnection(freelancerId, userRepo, linearService);
    assert.equal(status.connected, true);
    assert.equal(status.workspace?.name, "Varun's Linear Workspace");
    assert.equal(status.teams?.length, 2);
  });

  it("rejects Linear connection if user is not a FREELANCER", async () => {
    const client = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "goog_client_77",
        email: "client@corp.org",
        name: "Client Owner",
      },
      "CLIENT"
    );

    await assert.rejects(
      async () => {
        await connectLinearWorkspace(
          client.id,
          "valid_auth_code_123",
          "http://localhost:3000/api/auth/linear/callback",
          userRepo,
          linearService
        );
      },
      {
        message: "Only users with the FREELANCER role can connect a Linear workspace",
      }
    );
  });

  it("fails gracefully when authorization code is invalid", async () => {
    await assert.rejects(
      async () => {
        await connectLinearWorkspace(
          freelancerId,
          "invalid_code",
          "http://localhost:3000/api/auth/linear/callback",
          userRepo,
          linearService
        );
      },
      {
        message: "Invalid or expired authorization code",
      }
    );
  });

  it("disconnects Linear workspace and clears credentials from user model", async () => {
    // 1. Connect
    await connectLinearWorkspace(
      freelancerId,
      "valid_code_999",
      "http://localhost:3000/api/auth/linear/callback",
      userRepo,
      linearService
    );

    let user = await userRepo.findById(freelancerId);
    assert.ok(user?.linearAccessToken);

    // 2. Disconnect
    await disconnectLinearWorkspace(freelancerId, userRepo);

    user = await userRepo.findById(freelancerId);
    assert.equal(user?.linearAccessToken, null);
    assert.equal(user?.linearRefreshToken, null);
    assert.equal(user?.linearWorkspaceId, null);
    assert.equal(user?.linearWorkspaceName, null);

    const status = await verifyLinearConnection(freelancerId, userRepo, linearService);
    assert.equal(status.connected, false);
  });

  it("LiveLinearService surfaces GraphQL errors even when HTTP status is 200", async () => {
    const liveService = new LiveLinearService();
    const originalFetch = global.fetch;

    try {
      // Mock fetch returning GraphQL errors array with 200 OK
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            errors: [{ message: "Unauthorized Linear API request" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );

      await assert.rejects(
        async () => {
          await liveService.getViewerWorkspace("live_access_token_123");
        },
        {
          message: /Linear GraphQL error fetching workspace: Unauthorized Linear API request/,
        }
      );

      await assert.rejects(
        async () => {
          await liveService.listTeams("live_access_token_123");
        },
        {
          message: /Linear GraphQL error listing teams: Unauthorized Linear API request/,
        }
      );

      await assert.rejects(
        async () => {
          await liveService.createProject("live_access_token_123", {
            name: "Test Project",
            teamIds: ["team_1"],
          });
        },
        {
          message: /Linear GraphQL error creating project: Unauthorized Linear API request/,
        }
      );

      await assert.rejects(
        async () => {
          await liveService.createIssue("live_access_token_123", {
            teamId: "team_1",
            title: "Test Issue",
          });
        },
        {
          message: /Linear GraphQL error creating issue: Unauthorized Linear API request/,
        }
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
