import { NextResponse } from "next/server";
import { processRetries, processPendingEmails } from "@/lib/dunning/engine";

// This endpoint is called by a cron job to process retries and send emails.
// In production, use Vercel Cron or similar.
// Secured by CRON_SECRET header.

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const retryResults = await processRetries();
    const emailResults = await processPendingEmails();

    return NextResponse.json({
      retries: retryResults,
      emails: emailResults,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Retry processing error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
