import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  handleOAuthCallback,
  checkRouteAccess,
  roleForProvider,
  defaultDashboardForRole,
} from "./service";
import { InMemoryUserRepository } from "./adapter";
import { createSessionToken, verifySessionToken } from "./session";
import { OAuthProfile } from "./types";

describe("CommitCheck Dual-Provider Authentication & Role Gating", () => {
  let userRepo: InMemoryUserRepository;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
  });

  describe("Provider to Role Mapping", () => {
    it("maps github provider to FREELANCER role", () => {
      assert.equal(roleForProvider("github"), "FREELANCER");
      assert.equal(defaultDashboardForRole("FREELANCER"), "/freelancer");
    });

    it("maps google provider to CLIENT role", () => {
      assert.equal(roleForProvider("google"), "CLIENT");
      assert.equal(defaultDashboardForRole("CLIENT"), "/client");
    });
  });

  describe("OAuth Callback Handling", () => {
    it("assigns FREELANCER role upon successful GitHub OAuth and directs to /freelancer", async () => {
      const githubProfile: OAuthProfile = {
        provider: "github",
        providerId: "gh_12345",
        email: "alex@developer.co",
        name: "Alex Dev",
        username: "alexdev",
        avatarUrl: "https://github.com/alexdev.png",
        accessToken: "gho_mock_access_token_123",
      };

      const result = await handleOAuthCallback(githubProfile, userRepo);

      assert.equal(result.user.role, "FREELANCER");
      assert.equal(result.user.email, "alex@developer.co");
      assert.equal(result.user.githubId, "gh_12345");
      assert.equal(result.user.githubUsername, "alexdev");
      assert.equal(result.redirectUrl, "/freelancer");

      // Verify session token
      const verifiedSession = await verifySessionToken(result.sessionToken);
      assert.ok(verifiedSession);
      assert.equal(verifiedSession.role, "FREELANCER");
      assert.equal(verifiedSession.userId, result.user.id);
    });

    it("assigns CLIENT role upon successful Google OAuth and directs to /client", async () => {
      const googleProfile: OAuthProfile = {
        provider: "google",
        providerId: "goog_98765",
        email: "sarah@clientcorp.io",
        name: "Sarah Founder",
        avatarUrl: "https://lh3.googleusercontent.com/avatar",
        accessToken: "ya29.mock_access_token_456",
      };

      const result = await handleOAuthCallback(googleProfile, userRepo);

      assert.equal(result.user.role, "CLIENT");
      assert.equal(result.user.email, "sarah@clientcorp.io");
      assert.equal(result.user.googleId, "goog_98765");
      assert.equal(result.redirectUrl, "/client");

      // Verify session token
      const verifiedSession = await verifySessionToken(result.sessionToken);
      assert.ok(verifiedSession);
      assert.equal(verifiedSession.role, "CLIENT");
      assert.equal(verifiedSession.userId, result.user.id);
    });

    it("prevents role ambiguity by rejecting cross-provider sign-in for the same email", async () => {
      // 1. Initial freelancer onboarding via GitHub
      await handleOAuthCallback(
        {
          provider: "github",
          providerId: "gh_12345",
          email: "shared@domain.com",
          name: "Shared User",
        },
        userRepo
      );

      // 2. Client attempts to sign in with Google using same email
      await assert.rejects(
        async () => {
          await handleOAuthCallback(
            {
              provider: "google",
              providerId: "goog_8888",
              email: "shared@domain.com",
              name: "Shared User",
            },
            userRepo
          );
        },
        {
          message:
            "Account email shared@domain.com is registered as FREELANCER. Sign in with the designated provider.",
        }
      );
    });
  });

  describe("Session Token Security", () => {
    it("verifies valid HMAC-signed tokens", async () => {
      const token = await createSessionToken({
        userId: "user_test_1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        role: "FREELANCER",
      });

      const session = await verifySessionToken(token);
      assert.ok(session);
      assert.equal(session.userId, "user_test_1");
      assert.equal(session.role, "FREELANCER");
    });

    it("rejects tampered tokens", async () => {
      const token = await createSessionToken({
        userId: "user_test_1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        role: "FREELANCER",
      });

      const [payload, sig] = token.split(".");
      // Tamper with payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({ userId: "hacked", role: "CLIENT", expiresAt: Date.now() + 10000 })
      ).toString("base64url");

      const tamperedToken = `${tamperedPayload}.${sig}`;
      const session = await verifySessionToken(tamperedToken);
      assert.equal(session, null);
    });

    it("rejects expired tokens", async () => {
      // Expired 1 second ago
      const token = await createSessionToken(
        {
          userId: "user_test_1",
          email: "test@example.com",
          name: "Test User",
          avatarUrl: null,
          role: "FREELANCER",
        },
        -1000
      );

      const session = await verifySessionToken(token);
      assert.equal(session, null);
    });
  });

  describe("Route Access Control & Middleware Gating", () => {
    it("redirects unauthenticated users trying to access /freelancer to sign in", () => {
      const result = checkRouteAccess("/freelancer/projects", null);
      assert.equal(result.allowed, false);
      assert.ok(result.redirectUrl?.includes("role=FREELANCER"));
    });

    it("blocks CLIENT role from accessing /freelancer and redirects to /client", () => {
      const result = checkRouteAccess("/freelancer/projects/new", "CLIENT");
      assert.equal(result.allowed, false);
      assert.equal(result.redirectUrl, "/client");
    });

    it("allows FREELANCER role to access /freelancer routes", () => {
      const result = checkRouteAccess("/freelancer/projects/new", "FREELANCER");
      assert.equal(result.allowed, true);
    });

    it("redirects unauthenticated users trying to access /client to sign in", () => {
      const result = checkRouteAccess("/client/audits", null);
      assert.equal(result.allowed, false);
      assert.ok(result.redirectUrl?.includes("role=CLIENT"));
    });

    it("blocks FREELANCER role from accessing /client and redirects to /freelancer", () => {
      const result = checkRouteAccess("/client/audits/report-123", "FREELANCER");
      assert.equal(result.allowed, false);
      assert.equal(result.redirectUrl, "/freelancer");
    });

    it("allows CLIENT role to access /client routes", () => {
      const result = checkRouteAccess("/client/audits/report-123", "CLIENT");
      assert.equal(result.allowed, true);
    });

    it("allows public access to landing page", () => {
      assert.equal(checkRouteAccess("/", null).allowed, true);
      assert.equal(checkRouteAccess("/", "FREELANCER").allowed, true);
      assert.equal(checkRouteAccess("/", "CLIENT").allowed, true);
    });
  });
});
