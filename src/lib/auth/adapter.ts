import { prisma } from "../prisma";
import { AuthUser, OAuthProfile, Role, UserRepository } from "./types";

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? this.mapToAuthUser(user) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? this.mapToAuthUser(user) : null;
  }

  async findByGithubId(githubId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { githubId },
    });
    return user ? this.mapToAuthUser(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { googleId },
    });
    return user ? this.mapToAuthUser(user) : null;
  }

  async upsertOAuthUser(profile: OAuthProfile, role: Role): Promise<AuthUser> {
    const email = profile.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role !== role) {
        throw new Error(
          `Account email ${email} is registered as ${existingUser.role}. Sign in with the designated provider.`
        );
      }

      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: profile.name ?? existingUser.name,
          avatarUrl: profile.avatarUrl ?? existingUser.avatarUrl,
          ...(profile.provider === "github"
            ? {
                githubId: profile.providerId,
                githubUsername: profile.username ?? existingUser.githubUsername,
                githubAccessToken: profile.accessToken ?? existingUser.githubAccessToken,
              }
            : {
                googleId: profile.providerId,
              }),
        },
      });
      return this.mapToAuthUser(updated);
    }

    const created = await prisma.user.create({
      data: {
        email,
        name: profile.name ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        role: role as any,
        ...(profile.provider === "github"
          ? {
              githubId: profile.providerId,
              githubUsername: profile.username ?? null,
              githubAccessToken: profile.accessToken ?? null,
            }
          : {
              googleId: profile.providerId,
            }),
      },
    });

    return this.mapToAuthUser(created);
  }

  private mapToAuthUser(raw: any): AuthUser {
    return {
      id: raw.id,
      email: raw.email,
      name: raw.name,
      avatarUrl: raw.avatarUrl,
      role: raw.role as Role,
      githubId: raw.githubId,
      githubUsername: raw.githubUsername,
      githubAccessToken: raw.githubAccessToken,
      googleId: raw.googleId,
      linearAccessToken: raw.linearAccessToken,
      linearWorkspaceId: raw.linearWorkspaceId,
      linearWorkspaceName: raw.linearWorkspaceName,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, AuthUser> = new Map();

  async findByEmail(email: string): Promise<AuthUser | null> {
    const lower = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === lower) return { ...user };
    }
    return null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByGithubId(githubId: string): Promise<AuthUser | null> {
    for (const user of this.users.values()) {
      if (user.githubId === githubId) return { ...user };
    }
    return null;
  }

  async findByGoogleId(googleId: string): Promise<AuthUser | null> {
    for (const user of this.users.values()) {
      if (user.googleId === googleId) return { ...user };
    }
    return null;
  }

  async upsertOAuthUser(profile: OAuthProfile, role: Role): Promise<AuthUser> {
    const email = profile.email.toLowerCase();
    const existing = await this.findByEmail(email);

    if (existing) {
      if (existing.role !== role) {
        throw new Error(
          `Account email ${email} is registered as ${existing.role}. Sign in with the designated provider.`
        );
      }

      const updated: AuthUser = {
        ...existing,
        name: profile.name ?? existing.name,
        avatarUrl: profile.avatarUrl ?? existing.avatarUrl,
        githubId: profile.provider === "github" ? profile.providerId : existing.githubId,
        githubUsername: profile.provider === "github" ? (profile.username ?? existing.githubUsername) : existing.githubUsername,
        githubAccessToken: profile.provider === "github" ? (profile.accessToken ?? existing.githubAccessToken) : existing.githubAccessToken,
        googleId: profile.provider === "google" ? profile.providerId : existing.googleId,
        updatedAt: new Date(),
      };
      this.users.set(existing.id, updated);
      return { ...updated };
    }

    const id = `user_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date();
    const newUser: AuthUser = {
      id,
      email,
      name: profile.name ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      role,
      githubId: profile.provider === "github" ? profile.providerId : null,
      githubUsername: profile.provider === "github" ? (profile.username ?? null) : null,
      githubAccessToken: profile.provider === "github" ? (profile.accessToken ?? null) : null,
      googleId: profile.provider === "google" ? profile.providerId : null,
      linearAccessToken: null,
      linearWorkspaceId: null,
      linearWorkspaceName: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, newUser);
    return { ...newUser };
  }

  clear() {
    this.users.clear();
  }
}
