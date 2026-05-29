import { NextRequest, NextResponse } from "next/server";
import { processRetries, processPendingEmails } from "@/lib/dunning/engine";

// Secret key to protect the cron endpoint
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startTime = Date.now();

    // Process pending retries
    const retryResults = await processRetries();

    // Process pending dunning emails
    const emailResults = await processPendingEmails();

    const duration = Date.now() - startTime;

    const summary = {
      ok: true,
      duration_ms: duration,
      retries: retryResults,
      emails: emailResults,
      timestamp: new Date().toISOString(),
    };

    console.log("[DunningBee Cron]", JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("[DunningBee Cron] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Cron worker failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support GET for simple health checks
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "healthy",
    service: "dunningbee-cron",
    timestamp: new Date().toISOString(),
  });
}
