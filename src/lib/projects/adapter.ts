import { prisma } from "../prisma";
import { CreateProjectInput, Project, ProjectRepository } from "./types";

export class PrismaProjectRepository implements ProjectRepository {
  async createProject(
    freelancerId: string,
    input: CreateProjectInput,
    clientId?: string | null
  ): Promise<Project> {
    const raw = await prisma.project.create({
      data: {
        name: input.title,
        title: input.title,
        description: input.description ?? null,
        clientEmail: input.clientEmail.toLowerCase(),
        githubRepo: input.githubRepoFullName,
        githubRepoFullName: input.githubRepoFullName,
        status: "ACTIVE",
        freelancerId,
        clientId: clientId ?? null,
      },
    });

    return this.mapToProject(raw);
  }

  async findProjectById(id: string): Promise<Project | null> {
    const raw = await prisma.project.findUnique({
      where: { id },
    });
    return raw ? this.mapToProject(raw) : null;
  }

  async listProjectsForFreelancer(freelancerId: string): Promise<Project[]> {
    const records = await prisma.project.findMany({
      where: { freelancerId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(this.mapToProject);
  }

  async listProjectsForClient(clientEmail: string): Promise<Project[]> {
    const records = await prisma.project.findMany({
      where: { clientEmail: clientEmail.toLowerCase() },
      orderBy: { createdAt: "desc" },
    });
    return records.map(this.mapToProject);
  }

  async updateLinearProject(
    id: string,
    data: { linearProjectId: string; linearProjectUrl?: string | null; linearTeamId?: string | null }
  ): Promise<Project> {
    const raw = await prisma.project.update({
      where: { id },
      data: {
        linearProjectId: data.linearProjectId,
        linearProjectUrl: data.linearProjectUrl ?? null,
        linearTeamId: data.linearTeamId ?? null,
      },
    });
    return this.mapToProject(raw);
  }

  private mapToProject(raw: any): Project {
    return {
      id: raw.id,
      name: raw.name,
      title: raw.title || raw.name,
      description: raw.description,
      clientEmail: raw.clientEmail,
      githubRepo: raw.githubRepo,
      githubRepoFullName: raw.githubRepoFullName || raw.githubRepo,
      status: raw.status || "ACTIVE",
      linearProjectId: raw.linearProjectId,
      linearProjectUrl: raw.linearProjectUrl ?? null,
      linearTeamId: raw.linearTeamId ?? null,
      freelancerId: raw.freelancerId,
      clientId: raw.clientId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}

export class InMemoryProjectRepository implements ProjectRepository {
  private projects: Map<string, Project> = new Map();

  async createProject(
    freelancerId: string,
    input: CreateProjectInput,
    clientId?: string | null
  ): Promise<Project> {
    const id = `proj_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date();
    const newProject: Project = {
      id,
      name: input.title,
      title: input.title,
      description: input.description ?? null,
      clientEmail: input.clientEmail.toLowerCase(),
      githubRepo: input.githubRepoFullName,
      githubRepoFullName: input.githubRepoFullName,
      status: "ACTIVE",
      linearProjectId: null,
      linearProjectUrl: null,
      linearTeamId: null,
      freelancerId,
      clientId: clientId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(id, newProject);
    return { ...newProject };
  }

  async findProjectById(id: string): Promise<Project | null> {
    const project = this.projects.get(id);
    return project ? { ...project } : null;
  }

  async listProjectsForFreelancer(freelancerId: string): Promise<Project[]> {
    const list: Project[] = [];
    for (const p of this.projects.values()) {
      if (p.freelancerId === freelancerId) list.push({ ...p });
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listProjectsForClient(clientEmail: string): Promise<Project[]> {
    const lower = clientEmail.toLowerCase();
    const list: Project[] = [];
    for (const p of this.projects.values()) {
      if (p.clientEmail?.toLowerCase() === lower) list.push({ ...p });
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateLinearProject(
    id: string,
    data: { linearProjectId: string; linearProjectUrl?: string | null; linearTeamId?: string | null }
  ): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error("Project not found");

    const updated: Project = {
      ...existing,
      linearProjectId: data.linearProjectId,
      linearProjectUrl: data.linearProjectUrl ?? null,
      linearTeamId: data.linearTeamId ?? null,
      updatedAt: new Date(),
    };
    this.projects.set(id, updated);
    return { ...updated };
  }

  clear() {
    this.projects.clear();
  }
}
