import { NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultGitHubService } from "@/lib/projects";

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await defaultUserRepository.findById(session.userId);
  const accessToken = user?.githubAccessToken || "mock_token";

  try {
    const repos = await defaultGitHubService.listUserRepositories(accessToken);
    return NextResponse.json({ repositories: repos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
