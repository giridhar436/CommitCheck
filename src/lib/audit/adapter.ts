import { prisma } from "../prisma";
import {
  AuditReportData,
  AuditRepository,
  AuditorRole,
  Discrepancy,
  VerifiedTaskItem,
} from "./types";

export class PrismaAuditRepository implements AuditRepository {
  async createAuditReport(data: {
    projectId: string;
    auditorRole: AuditorRole;
    summary: string;
    verifiedPercentage: number;
    verifiedTasks: VerifiedTaskItem[];
    discrepancies: Discrepancy[];
    ghostCompletions: number;
    untrackedCommits: number;
    latestCommitSha?: string | null;
    triggeredById: string;
  }): Promise<AuditReportData> {
    const raw = await prisma.auditReport.create({
      data: {
        projectId: data.projectId,
        auditorRole: data.auditorRole,
        summary: data.summary,
        verifiedPercentage: data.verifiedPercentage,
        verifiedTasksJson: JSON.stringify(data.verifiedTasks),
        discrepanciesJson: JSON.stringify(data.discrepancies),
        ghostCompletions: data.ghostCompletions,
        untrackedCommits: data.untrackedCommits,
        latestCommitSha: data.latestCommitSha ?? null,
        triggeredById: data.triggeredById,
        status: "COMPLETED",
      },
    });

    return this.mapToAuditReport(raw);
  }

  async findLatestReportForProject(projectId: string): Promise<AuditReportData | null> {
    const raw = await prisma.auditReport.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return raw ? this.mapToAuditReport(raw) : null;
  }

  async listReportsForProject(projectId: string): Promise<AuditReportData[]> {
    const records = await prisma.auditReport.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return records.map(this.mapToAuditReport);
  }

  private mapToAuditReport(raw: any): AuditReportData {
    let verifiedTasks: VerifiedTaskItem[] = [];
    let discrepancies: Discrepancy[] = [];

    try {
      verifiedTasks = JSON.parse(raw.verifiedTasksJson || "[]");
    } catch {
      verifiedTasks = [];
    }

    try {
      discrepancies = JSON.parse(raw.discrepanciesJson || "[]");
    } catch {
      discrepancies = [];
    }

    return {
      id: raw.id,
      projectId: raw.projectId,
      status: raw.status || "COMPLETED",
      auditorRole: raw.auditorRole as AuditorRole,
      summary: raw.summary,
      verifiedPercentage: raw.verifiedPercentage,
      ghostCompletions: raw.ghostCompletions,
      untrackedCommits: raw.untrackedCommits,
      latestCommitSha: raw.latestCommitSha,
      triggeredById: raw.triggeredById,
      createdAt: raw.createdAt,
      verifiedTasks,
      discrepancies,
    };
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private reports: Map<string, AuditReportData> = new Map();

  async createAuditReport(data: {
    projectId: string;
    auditorRole: AuditorRole;
    summary: string;
    verifiedPercentage: number;
    verifiedTasks: VerifiedTaskItem[];
    discrepancies: Discrepancy[];
    ghostCompletions: number;
    untrackedCommits: number;
    latestCommitSha?: string | null;
    triggeredById: string;
  }): Promise<AuditReportData> {
    const id = `audit_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date();

    const report: AuditReportData = {
      id,
      projectId: data.projectId,
      status: "COMPLETED",
      auditorRole: data.auditorRole,
      summary: data.summary,
      verifiedPercentage: data.verifiedPercentage,
      verifiedTasks: [...data.verifiedTasks],
      discrepancies: [...data.discrepancies],
      ghostCompletions: data.ghostCompletions,
      untrackedCommits: data.untrackedCommits,
      latestCommitSha: data.latestCommitSha ?? null,
      triggeredById: data.triggeredById,
      createdAt: now,
    };

    this.reports.set(id, report);
    return { ...report };
  }

  async findLatestReportForProject(projectId: string): Promise<AuditReportData | null> {
    const projectReports = Array.from(this.reports.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return projectReports[0] ? { ...projectReports[0] } : null;
  }

  async listReportsForProject(projectId: string): Promise<AuditReportData[]> {
    return Array.from(this.reports.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({ ...r }));
  }

  clear() {
    this.reports.clear();
  }
}

export const defaultAuditRepository = new PrismaAuditRepository();
