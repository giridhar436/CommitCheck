export type Role = "FREELANCER" | "CLIENT";

export type OAuthProvider = "github" | "google";

export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  username?: string;
  accessToken?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  githubId: string | null;
  githubUsername: string | null;
  githubAccessToken?: string | null;
  googleId: string | null;
  linearAccessToken: string | null;
  linearWorkspaceId: string | null;
  linearWorkspaceName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  expiresAt: number;
}

export interface RouteAccessResult {
  allowed: boolean;
  redirectUrl?: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  findByGithubId(githubId: string): Promise<AuthUser | null>;
  findByGoogleId(googleId: string): Promise<AuthUser | null>;
  upsertOAuthUser(profile: OAuthProfile, role: Role): Promise<AuthUser>;
}
