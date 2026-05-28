import { db } from "@/lib/db";
import {
  failedPayments,
  dunningSequences,
  dunningEmails,
  dunningSettings,
  stripeConnections,
  recoveryEvents,
  accounts,
} from "@/lib/db/schema";
import { eq, and, lte, isNull } from "drizzle-orm";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { stripeAsConnected } from "@/lib/stripe";

// ── Default retry intervals (hours after initial failure) ──

const DEFAULT_RETRY_DELAYS = [1, 24, 72]; // 1hr, 24hr, 72hr
const DEFAULT_EMAIL_DELAYS = [1, 48, 120]; // 1hr, 2 days, 5 days

const EMAIL_STEPS = [
  "friendly_reminder",
  "card_update",
  "last_chance",
] as const;

// ── Handle a new failed payment from Stripe webhook ────

export async function handleFailedPayment(params: {
  accountId: string;
  stripeConnectionId: string;
  invoiceId: string;
  customerId: string;
  subscriptionId?: string;
  customerEmail: string;
  customerName?: string;
  amountCents: number;
  currency: string;
  failureCode?: string;
  failureMessage?: string;
}) {
  // Check if we already track this invoice
  const existing = await db.query.failedPayments.findFirst({
    where: and(
      eq(failedPayments.stripeInvoiceId, params.invoiceId),
      eq(failedPayments.accountId, params.accountId)
    ),
  });

  if (existing) {
    // Update retry count
    await db
      .update(failedPayments)
      .set({
        retryCount: existing.retryCount + 1,
        failureCode: params.failureCode,
        failureMessage: params.failureMessage,
        updatedAt: new Date(),
      })
      .where(eq(failedPayments.id, existing.id));
    return existing;
  }

  // Get account settings for timing
  const settings = await db.query.dunningSettings.findFirst({
    where: eq(dunningSettings.accountId, params.accountId),
  });

  const retryDelay1 = settings?.retryDelay1Hours ?? DEFAULT_RETRY_DELAYS[0];

  const now = new Date();
  const nextRetry = new Date(now.getTime() + retryDelay1 * 60 * 60 * 1000);

  // Create failed payment record
  const [fp] = await db
    .insert(failedPayments)
    .values({
      accountId: params.accountId,
      stripeConnectionId: params.stripeConnectionId,
      stripeInvoiceId: params.invoiceId,
      stripeCustomerId: params.customerId,
      stripeSubscriptionId: params.subscriptionId,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      amountCents: params.amountCents,
      currency: params.currency,
      failureCode: params.failureCode,
      failureMessage: params.failureMessage,
      status: "failed",
      nextRetryAt: nextRetry,
      failedAt: now,
    })
    .returning();

  // Create dunning sequence
  const [seq] = await db
    .insert(dunningSequences)
    .values({
      failedPaymentId: fp.id,
      accountId: params.accountId,
      currentStep: "friendly_reminder",
      status: "active",
    })
    .returning();

  // Schedule first dunning email
  const emailDelay1 = settings?.emailDelay1Hours ?? DEFAULT_EMAIL_DELAYS[0];
  const emailSubject =
    settings?.emailSubject1 ?? "Your payment didn't go through";

  await db.insert(dunningEmails).values({
    sequenceId: seq.id,
    step: "friendly_reminder",
    recipientEmail: params.customerEmail,
    subject: emailSubject,
    scheduledFor: new Date(now.getTime() + emailDelay1 * 60 * 60 * 1000),
  });

  return fp;
}

// ── Process pending retries ────────────────────────────

export async function processRetries() {
  const now = new Date();

  // Get all payments due for retry
  const dueRetries = await db.query.failedPayments.findMany({
    where: and(
      eq(failedPayments.status, "failed"),
      lte(failedPayments.nextRetryAt, now)
    ),
    with: {
      stripeConnection: true,
      account: true,
    },
  });

  const results = {
    processed: 0,
    recovered: 0,
    failed: 0,
  };

  for (const payment of dueRetries) {
    if (!payment.stripeConnection?.connected) continue;

    results.processed++;

    try {
      // Use the connected account's credentials to retry the invoice
      const connectedStripe = stripeAsConnected(
        payment.stripeConnection.accessToken
      );

      const invoice = await connectedStripe.invoices.pay(
        payment.stripeInvoiceId,
        { forgive: false }
      );

      if (invoice.status === "paid") {
        // Payment recovered!
        await markRecovered(payment.id, payment.accountId, payment.amountCents, "auto_retry");
        results.recovered++;
      } else {
        await scheduleNextRetry(payment);
        results.failed++;
      }
    } catch (error: any) {
      // Retry failed — schedule next attempt
      await scheduleNextRetry(payment);
      results.failed++;
    }
  }

  return results;
}

// ── Schedule next retry based on settings ──────────────

async function scheduleNextRetry(payment: typeof failedPayments.$inferSelect) {
  const settings = await db.query.dunningSettings.findFirst({
    where: eq(dunningSettings.accountId, payment.accountId),
  });

  const delays = [
    settings?.retryDelay1Hours ?? DEFAULT_RETRY_DELAYS[0],
    settings?.retryDelay2Hours ?? DEFAULT_RETRY_DELAYS[1],
    settings?.retryDelay3Hours ?? DEFAULT_RETRY_DELAYS[2],
  ];

  const nextRetryIndex = payment.retryCount; // 0-indexed, already incremented

  if (nextRetryIndex >= delays.length) {
    // Exhausted all retries
    await db
      .update(failedPayments)
      .set({
        status: "abandoned",
        nextRetryAt: null,
        updatedAt: new Date(),
      })
      .where(eq(failedPayments.id, payment.id));

    // Update dunning sequence status
    await db
      .update(dunningSequences)
      .set({
        status: "exhausted",
        completedAt: new Date(),
      })
      .where(eq(dunningSequences.failedPaymentId, payment.id));

    return;
  }

  const nextDelay = delays[nextRetryIndex];
  const nextRetryAt = new Date(Date.now() + nextDelay * 60 * 60 * 1000);

  await db
    .update(failedPayments)
    .set({
      retryCount: payment.retryCount + 1,
      status: "retrying",
      nextRetryAt,
      updatedAt: new Date(),
    })
    .where(eq(failedPayments.id, payment.id));
}

// ── Process pending dunning emails ─────────────────────

export async function processPendingEmails() {
  const now = new Date();

  const pendingEmails = await db.query.dunningEmails.findMany({
    where: and(
      eq(dunningEmails.status, "pending"),
      lte(dunningEmails.scheduledFor, now)
    ),
    with: {
      sequence: {
        with: {
          failedPayment: {
            with: {
              account: true,
              stripeConnection: true,
            },
          },
        },
      },
    },
  });

  const results = { sent: 0, failed: 0 };

  for (const email of pendingEmails) {
    const { sequence } = email;
    if (!sequence || sequence.status !== "active") continue;

    const { failedPayment } = sequence;
    if (!failedPayment) continue;

    // Don't send if already recovered
    if (failedPayment.status === "recovered") {
      await db
        .update(dunningEmails)
        .set({ status: "failed" })
        .where(eq(dunningEmails.id, email.id));
      continue;
    }

    // Get account settings
    const settings = await db.query.dunningSettings.findFirst({
      where: eq(dunningSettings.accountId, failedPayment.accountId),
    });

    try {
      const updateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/update-card?invoice=${failedPayment.stripeInvoiceId}`;

      const { data, error } = await resend.emails.send({
        from: `${settings?.senderName ?? "Billing"} <${FROM_EMAIL}>`,
        to: email.recipientEmail,
        subject: email.subject,
        replyTo: settings?.replyToEmail ?? undefined,
        html: buildEmailHtml({
          step: email.step,
          customerName: failedPayment.customerName ?? "there",
          amount: formatAmount(failedPayment.amountCents, failedPayment.currency),
          companyName: failedPayment.account?.companyName ?? "your subscription",
          updateUrl,
        }),
      });

      if (error) throw error;

      await db
        .update(dunningEmails)
        .set({
          status: "sent",
          sentAt: new Date(),
          resendMessageId: data?.id,
        })
        .where(eq(dunningEmails.id, email.id));

      results.sent++;

      // Schedule next email in sequence
      await scheduleNextEmail(sequence, failedPayment, settings);
    } catch (error) {
      await db
        .update(dunningEmails)
        .set({ status: "failed" })
        .where(eq(dunningEmails.id, email.id));
      results.failed++;
    }
  }

  return results;
}

// ── Schedule the next email in the dunning sequence ────

async function scheduleNextEmail(
  sequence: typeof dunningSequences.$inferSelect,
  payment: typeof failedPayments.$inferSelect,
  settings: typeof dunningSettings.$inferSelect | undefined
) {
  const stepIndex = EMAIL_STEPS.indexOf(sequence.currentStep);
  const nextStepIndex = stepIndex + 1;

  if (nextStepIndex >= EMAIL_STEPS.length) return; // Sequence complete

  const nextStep = EMAIL_STEPS[nextStepIndex];
  const emailDelays = [
    settings?.emailDelay1Hours ?? DEFAULT_EMAIL_DELAYS[0],
    settings?.emailDelay2Hours ?? DEFAULT_EMAIL_DELAYS[1],
    settings?.emailDelay3Hours ?? DEFAULT_EMAIL_DELAYS[2],
  ];

  const subjects = [
    settings?.emailSubject1 ?? "Your payment didn't go through",
    settings?.emailSubject2 ?? "Action needed: please update your card",
    settings?.emailSubject3 ?? "Last chance to keep your subscription",
  ];

  const delay = emailDelays[nextStepIndex];
  const scheduledFor = new Date(
    payment.failedAt.getTime() + delay * 60 * 60 * 1000
  );

  // Update sequence step
  await db
    .update(dunningSequences)
    .set({ currentStep: nextStep })
    .where(eq(dunningSequences.id, sequence.id));

  // Create next email
  await db.insert(dunningEmails).values({
    sequenceId: sequence.id,
    step: nextStep,
    recipientEmail: payment.customerEmail,
    subject: subjects[nextStepIndex],
    scheduledFor,
  });
}

// ── Mark payment as recovered ──────────────────────────

export async function markRecovered(
  paymentId: string,
  accountId: string,
  amountCents: number,
  method: string
) {
  const now = new Date();

  await db
    .update(failedPayments)
    .set({
      status: "recovered",
      recoveredAt: now,
      recoveredAmountCents: amountCents,
      nextRetryAt: null,
      updatedAt: now,
    })
    .where(eq(failedPayments.id, paymentId));

  // Complete dunning sequence
  await db
    .update(dunningSequences)
    .set({
      status: "recovered",
      completedAt: now,
    })
    .where(eq(dunningSequences.failedPaymentId, paymentId));

  // Record recovery event
  await db.insert(recoveryEvents).values({
    accountId,
    failedPaymentId: paymentId,
    recoveryMethod: method,
    amountCents,
  });
}

// ── Email HTML builder ─────────────────────────────────

function buildEmailHtml(params: {
  step: string;
  customerName: string;
  amount: string;
  companyName: string;
  updateUrl: string;
}): string {
  const { step, customerName, amount, companyName, updateUrl } = params;

  const templates: Record<string, { heading: string; body: string; cta: string }> = {
    friendly_reminder: {
      heading: "Heads up — your payment didn't go through",
      body: `Hi ${customerName},<br><br>We tried to charge ${amount} for ${companyName}, but your payment method was declined. This happens sometimes — expired cards, insufficient funds, the usual suspects.<br><br>We'll automatically retry, but you can also update your payment info right now:`,
      cta: "Update Payment Method",
    },
    card_update: {
      heading: "Action needed: your subscription is at risk",
      body: `Hi ${customerName},<br><br>We've tried a few times to process your ${amount} payment for ${companyName}, but it's still not going through.<br><br>To keep your access, please update your payment method:`,
      cta: "Update Card Now",
    },
    last_chance: {
      heading: "Last chance to keep your subscription",
      body: `Hi ${customerName},<br><br>This is our final attempt to collect your ${amount} payment for ${companyName}. If we can't process payment soon, your subscription will be cancelled.<br><br>Update your payment method to keep your access:`,
      cta: "Save My Subscription",
    },
  };

  const template = templates[step] ?? templates.friendly_reminder;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; background: #ffffff;">
  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 20px;">${template.heading}</h2>
  <p style="font-size: 16px; line-height: 1.6; color: #333;">${template.body}</p>
  <a href="${updateUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #0066FF; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${template.cta}</a>
  <p style="font-size: 14px; color: #666; margin-top: 32px;">If you've already updated your payment method, you can ignore this email. We'll retry automatically.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;">Powered by DunningBee — Recover failed payments automatically.</p>
</body>
</html>`;
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
