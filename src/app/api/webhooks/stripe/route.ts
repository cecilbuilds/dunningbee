import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { stripeConnections, failedPayments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { handleFailedPayment, markRecovered } from "@/lib/dunning/engine";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, event.account);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.account);
        break;

      case "charge.failed":
        // Handled via invoice.payment_failed for subscription charges
        // This catches one-off charge failures
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          event.account
        );
        break;

      case "customer.subscription.deleted":
        // Log churn event — the dunning sequence was exhausted
        break;

      default:
        // Unhandled event type
        break;
    }
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ── Handle invoice.payment_failed ──────────────────────

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  connectedAccountId?: string
) {
  if (!connectedAccountId) return;

  // Find the stripe connection
  const connection = await db.query.stripeConnections.findFirst({
    where: eq(stripeConnections.stripeAccountId, connectedAccountId),
  });

  if (!connection || !connection.connected) return;

  // Extract customer info
  const customerEmail =
    typeof invoice.customer_email === "string"
      ? invoice.customer_email
      : (invoice as any).customer_email ?? "";

  const customerName =
    typeof invoice.customer_name === "string"
      ? invoice.customer_name
      : null;

  if (!customerEmail) {
    console.error("No customer email on invoice", invoice.id);
    return;
  }

  const charge = invoice.charge
    ? typeof invoice.charge === "string"
      ? null
      : invoice.charge
    : null;

  await handleFailedPayment({
    accountId: connection.accountId,
    stripeConnectionId: connection.id,
    invoiceId: invoice.id,
    customerId:
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id ?? "",
    subscriptionId:
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id,
    customerEmail,
    customerName,
    amountCents: invoice.amount_due,
    currency: invoice.currency,
    failureCode: charge?.failure_code ?? undefined,
    failureMessage: charge?.failure_message ?? undefined,
  });
}

// ── Handle invoice.payment_succeeded (recovery!) ───────

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  connectedAccountId?: string
) {
  if (!connectedAccountId) return;

  const connection = await db.query.stripeConnections.findFirst({
    where: eq(stripeConnections.stripeAccountId, connectedAccountId),
  });

  if (!connection) return;

  // Check if this invoice had a failed payment we were tracking
  const payment = await db.query.failedPayments.findFirst({
    where: and(
      eq(failedPayments.stripeInvoiceId, invoice.id),
      eq(failedPayments.accountId, connection.accountId)
    ),
  });

  if (payment && payment.status !== "recovered") {
    await markRecovered(
      payment.id,
      connection.accountId,
      invoice.amount_paid,
      "auto_retry"
    );
  }
}

// ── Handle subscription updates ────────────────────────

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  connectedAccountId?: string
) {
  if (!connectedAccountId) return;

  // If the subscription becomes active again after past_due, it means
  // the customer updated their card — mark as recovered
  if (subscription.status === "active") {
    const connection = await db.query.stripeConnections.findFirst({
      where: eq(stripeConnections.stripeAccountId, connectedAccountId),
    });

    if (!connection) return;

    // Find any active failed payments for this subscription
    const activeFailures = await db.query.failedPayments.findMany({
      where: and(
        eq(failedPayments.stripeSubscriptionId, subscription.id),
        eq(failedPayments.accountId, connection.accountId)
      ),
    });

    for (const payment of activeFailures) {
      if (payment.status !== "recovered") {
        await markRecovered(
          payment.id,
          connection.accountId,
          payment.amountCents,
          "card_update"
        );
      }
    }
  }
}
