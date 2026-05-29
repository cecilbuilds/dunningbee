import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { failedPayments, stripeConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { stripeAsConnected } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const { invoiceId } = await request.json();

  if (!invoiceId) {
    return NextResponse.json(
      { error: "Missing invoice ID" },
      { status: 400 }
    );
  }

  try {
    // Find the failed payment and its Stripe connection
    const payment = await db.query.failedPayments.findFirst({
      where: eq(failedPayments.stripeInvoiceId, invoiceId),
      with: {
        stripeConnection: true,
      },
    });

    if (!payment || !payment.stripeConnection) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.status === "recovered") {
      return NextResponse.json(
        { error: "Payment already recovered" },
        { status: 400 }
      );
    }

    // Create a Stripe Customer Portal session for the connected account
    // This lets the end customer update their card securely on the merchant's Stripe
    const connectedStripe = stripeAsConnected(
      payment.stripeConnection.accessToken
    );

    // Use Stripe Billing Portal (customer portal) for card update
    const session = await connectedStripe.billingPortal.sessions.create({
      customer: payment.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/update-card?invoice=${invoiceId}&status=success`,
      flow_data: {
        type: "payment_method_update",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Create session error:", error);

    // Fallback: create a Stripe Checkout session in setup mode
    try {
      const payment = await db.query.failedPayments.findFirst({
        where: eq(failedPayments.stripeInvoiceId, invoiceId),
        with: { stripeConnection: true },
      });

      if (payment?.stripeConnection) {
        const connectedStripe = stripeAsConnected(
          payment.stripeConnection.accessToken
        );

        const checkoutSession =
          await connectedStripe.checkout.sessions.create({
            mode: "setup",
            customer: payment.stripeCustomerId,
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/update-card?invoice=${invoiceId}&status=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/update-card?invoice=${invoiceId}`,
            payment_method_types: ["card"],
          });

        return NextResponse.json({ url: checkoutSession.url });
      }
    } catch (fallbackError) {
      console.error("Fallback session error:", fallbackError);
    }

    return NextResponse.json(
      { error: "Failed to create update session" },
      { status: 500 }
    );
  }
}
