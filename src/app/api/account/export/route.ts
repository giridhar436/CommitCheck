import { NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultAuditRepository } from "@/lib/audit";
import { defaultTaskDraftRepository } from "@/lib/scope";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await defaultUserRepository.findById(session.userId);

  let projects = [];
  if (session.role === "FREELANCER") {
    projects = await defaultProjectRepository.listProjectsForFreelancer(session.userId);
  } else {
    projects = await defaultProjectRepository.listProjectsForClient(session.email);
  }

  const exportPayload: {
    exportDate: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      githubUsername: string | null;
      createdAt: Date;
    };
    projects: any[];
  } = {
    exportDate: new Date().toISOString(),
    user: {
      id: session.userId,
      email: session.email,
      name: session.name || null,
      role: session.role,
      githubUsername: user?.githubUsername || null,
      createdAt: user?.createdAt || new Date(),
    },
    projects: [],
  };

  for (const project of projects) {
    const audits = await defaultAuditRepository.listReportsForProject(project.id);
    const drafts = await defaultTaskDraftRepository.listDraftsForProject(project.id);

    exportPayload.projects.push({
      id: project.id,
      title: project.title,
      githubRepo: project.githubRepo,
      clientEmail: project.clientEmail,
      status: project.status,
      createdAt: project.createdAt,
      auditsCount: audits.length,
      audits: audits.map((a) => ({
        id: a.id,
        verifiedPercentage: a.verifiedPercentage,
        summary: a.summary,
        ghostCompletions: a.ghostCompletions,
        untrackedCommits: a.untrackedCommits,
        createdAt: a.createdAt,
      })),
      draftsCount: drafts.length,
      drafts: drafts.map((d) => ({
        id: d.id,
        title: d.title,
        classification: d.classification,
        clientApprovalStatus: d.clientApprovalStatus,
        status: d.status,
      })),
    });
  }

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="commitcheck-export-${session.userId}-${Date.now()}.json"`,
    },
  });
}
