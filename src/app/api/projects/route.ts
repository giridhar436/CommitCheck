import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import {
  createProjectService,
  defaultProjectRepository,
  defaultGitHubService,
} from "@/lib/projects";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (session.role === "FREELANCER") {
      const projects = await defaultProjectRepository.listProjectsForFreelancer(session.userId);
      return NextResponse.json({ projects });
    } else {
      const projects = await defaultProjectRepository.listProjectsForClient(session.email);
      return NextResponse.json({ projects });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json(
      { error: "Only authenticated Freelancers can create projects" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const project = await createProjectService(
      session.userId,
      body,
      defaultUserRepository,
      defaultProjectRepository,
      defaultGitHubService
    );

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
