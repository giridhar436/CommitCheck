import { NextResponse } from "next/server";
import { performLiveDatabaseCheck, validateEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const envReport = validateEnvironment();
  const dbCheck = await performLiveDatabaseCheck();

  const isHealthy = envReport.isReadyForTesting && dbCheck.connected;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      database: dbCheck,
      environment: envReport,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
