import { NextResponse } from "next/server";
import { getCurrentSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete user from database (cascades to owned projects, meetings, audits via Prisma schema relations)
    await prisma.user.delete({
      where: { id: session.userId },
    });

    const response = NextResponse.json({
      success: true,
      message: "Account and associated data deleted successfully.",
    });

    // Clear session cookie
    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;
  } catch (error: any) {
    console.error("Account deletion failed:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 }
    );
  }
}
