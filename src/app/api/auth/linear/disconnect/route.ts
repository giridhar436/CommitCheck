import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { disconnectLinearWorkspace } from "@/lib/linear";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await disconnectLinearWorkspace(session.userId, defaultUserRepository);
    return NextResponse.redirect(new URL("/freelancer/settings?success=linear_disconnected", request.url));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
