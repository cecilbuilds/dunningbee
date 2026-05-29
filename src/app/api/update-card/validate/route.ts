import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { failedPayments, stripeConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const invoiceId = request.nextUrl.searchParams.get("invoice");

  if (!invoiceId) {
    return NextResponse.json(
      { valid: false, message: "Missing invoice ID" },
      { status: 400 }
    );
  }

  try {
    const payment = await db.query.failedPayments.findFirst({
      where: eq(failedPayments.stripeInvoiceId, invoiceId),
    });

    if (!payment) {
      return NextResponse.json({
        valid: false,
        message: "This payment link is no longer valid.",
      });
    }

    if (payment.status === "recovered") {
      return NextResponse.json({
        valid: false,
        message: "This payment has already been recovered. No action needed!",
      });
    }

    if (payment.status === "abandoned") {
      return NextResponse.json({
        valid: false,
        message:
          "This payment is no longer being tracked. Please contact the merchant.",
      });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Validate error:", error);
    return NextResponse.json(
      { valid: false, message: "Unable to verify this link." },
      { status: 500 }
    );
  }
}
