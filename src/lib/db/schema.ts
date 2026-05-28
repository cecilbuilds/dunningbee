import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  jsonb,
  index,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────

export const planTierEnum = pgEnum("plan_tier", [
  "starter",
  "growth",
  "scale",
]);

export const dunningStepEnum = pgEnum("dunning_step", [
  "friendly_reminder",
  "card_update",
  "last_chance",
]);

export const sequenceStatusEnum = pgEnum("sequence_status", [
  "active",
  "recovered",
  "exhausted",
  "cancelled",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "pending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "failed",
  "retrying",
  "recovered",
  "abandoned",
]);

// ── Accounts (DunningBee users) ────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(), // Supabase auth user ID
  email: text("email").notNull(),
  companyName: text("company_name"),
  planTier: planTierEnum("plan_tier").notNull().default("starter"),
  stripeCustomerId: text("stripe_customer_id"), // Their DunningBee subscription
  stripeSubscriptionId: text("stripe_subscription_id"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Stripe Connections (customer's Stripe accounts) ────

export const stripeConnections = pgTable(
  "stripe_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    stripeAccountId: text("stripe_account_id").notNull().unique(), // acct_...
    accessToken: text("access_token").notNull(), // encrypted in production
    refreshToken: text("refresh_token"),
    livemode: boolean("livemode").notNull().default(false),
    scope: text("scope"),
    businessName: text("business_name"),
    connected: boolean("connected").notNull().default(true),
    webhookEndpointId: text("webhook_endpoint_id"), // we_...
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
  },
  (t) => ({
    accountIdx: index("stripe_conn_account_idx").on(t.accountId),
    stripeAcctIdx: index("stripe_conn_stripe_acct_idx").on(t.stripeAccountId),
  })
);

// ── Failed Payments ────────────────────────────────────

export const failedPayments = pgTable(
  "failed_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    stripeConnectionId: uuid("stripe_connection_id")
      .notNull()
      .references(() => stripeConnections.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id"),
    customerEmail: text("customer_email").notNull(),
    customerName: text("customer_name"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    status: paymentStatusEnum("status").notNull().default("failed"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }),
    recoveredAmountCents: integer("recovered_amount_cents"),
    failedAt: timestamp("failed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata"),
  },
  (t) => ({
    accountIdx: index("fp_account_idx").on(t.accountId),
    statusIdx: index("fp_status_idx").on(t.status),
    nextRetryIdx: index("fp_next_retry_idx").on(t.nextRetryAt),
    invoiceIdx: index("fp_invoice_idx").on(t.stripeInvoiceId),
  })
);

// ── Dunning Sequences ──────────────────────────────────

export const dunningSequences = pgTable(
  "dunning_sequences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    failedPaymentId: uuid("failed_payment_id")
      .notNull()
      .references(() => failedPayments.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    currentStep: dunningStepEnum("current_step").notNull().default("friendly_reminder"),
    status: sequenceStatusEnum("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    accountIdx: index("ds_account_idx").on(t.accountId),
    statusIdx: index("ds_status_idx").on(t.status),
  })
);

// ── Dunning Emails ─────────────────────────────────────

export const dunningEmails = pgTable(
  "dunning_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => dunningSequences.id, { onDelete: "cascade" }),
    step: dunningStepEnum("step").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject").notNull(),
    status: emailStatusEnum("status").notNull().default("pending"),
    resendMessageId: text("resend_message_id"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sequenceIdx: index("de_sequence_idx").on(t.sequenceId),
    scheduledIdx: index("de_scheduled_idx").on(t.scheduledFor),
    statusIdx: index("de_status_idx").on(t.status),
  })
);

// ── Dunning Settings (per account) ─────────────────────

export const dunningSettings = pgTable("dunning_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .unique()
    .references(() => accounts.id, { onDelete: "cascade" }),

  // Retry timing (hours after failure)
  retryDelay1Hours: integer("retry_delay_1_hours").notNull().default(1),
  retryDelay2Hours: integer("retry_delay_2_hours").notNull().default(24),
  retryDelay3Hours: integer("retry_delay_3_hours").notNull().default(72),

  // Email timing (hours after failure)
  emailDelay1Hours: integer("email_delay_1_hours").notNull().default(1),
  emailDelay2Hours: integer("email_delay_2_hours").notNull().default(48),
  emailDelay3Hours: integer("email_delay_3_hours").notNull().default(120),

  // Email customization
  senderName: text("sender_name").default("Billing"),
  replyToEmail: text("reply_to_email"),
  emailSubject1: text("email_subject_1").default("Your payment didn't go through"),
  emailSubject2: text("email_subject_2").default("Action needed: please update your card"),
  emailSubject3: text("email_subject_3").default("Last chance to keep your subscription"),

  // Notifications
  notifyOnFailure: boolean("notify_on_failure").notNull().default(true),
  notifyOnRecovery: boolean("notify_on_recovery").notNull().default(true),
  notificationEmail: text("notification_email"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Recovery Events (audit trail) ──────────────────────

export const recoveryEvents = pgTable(
  "recovery_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    failedPaymentId: uuid("failed_payment_id")
      .notNull()
      .references(() => failedPayments.id, { onDelete: "cascade" }),
    recoveryMethod: text("recovery_method").notNull(), // "auto_retry" | "email_click" | "manual"
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    accountIdx: index("re_account_idx").on(t.accountId),
    recoveredAtIdx: index("re_recovered_at_idx").on(t.recoveredAt),
  })
);

// ── Relations ──────────────────────────────────────────

export const accountsRelations = relations(accounts, ({ many, one }) => ({
  stripeConnections: many(stripeConnections),
  failedPayments: many(failedPayments),
  dunningSequences: many(dunningSequences),
  recoveryEvents: many(recoveryEvents),
  settings: one(dunningSettings),
}));

export const stripeConnectionsRelations = relations(stripeConnections, ({ one, many }) => ({
  account: one(accounts, {
    fields: [stripeConnections.accountId],
    references: [accounts.id],
  }),
  failedPayments: many(failedPayments),
}));

export const failedPaymentsRelations = relations(failedPayments, ({ one, many }) => ({
  account: one(accounts, {
    fields: [failedPayments.accountId],
    references: [accounts.id],
  }),
  stripeConnection: one(stripeConnections, {
    fields: [failedPayments.stripeConnectionId],
    references: [stripeConnections.id],
  }),
  dunningSequences: many(dunningSequences),
  recoveryEvents: many(recoveryEvents),
}));

export const dunningSequencesRelations = relations(dunningSequences, ({ one, many }) => ({
  failedPayment: one(failedPayments, {
    fields: [dunningSequences.failedPaymentId],
    references: [failedPayments.id],
  }),
  account: one(accounts, {
    fields: [dunningSequences.accountId],
    references: [accounts.id],
  }),
  emails: many(dunningEmails),
}));

export const dunningEmailsRelations = relations(dunningEmails, ({ one }) => ({
  sequence: one(dunningSequences, {
    fields: [dunningEmails.sequenceId],
    references: [dunningSequences.id],
  }),
}));
