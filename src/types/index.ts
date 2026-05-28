export type PlanTier = "starter" | "growth" | "scale";

export type DunningStep = "friendly_reminder" | "card_update" | "last_chance";

export type SequenceStatus = "active" | "recovered" | "exhausted" | "cancelled";

export type PaymentStatus = "failed" | "retrying" | "recovered" | "abandoned";

export type EmailStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed";

export interface DashboardStats {
  totalRevenueLost: number;
  totalRecovered: number;
  recoveryRate: number;
  activeSequences: number;
  failedPayments30d: number;
  recoveredPayments30d: number;
  recentPayments: FailedPaymentRow[];
}

export interface FailedPaymentRow {
  id: string;
  customerEmail: string;
  customerName: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  failureCode: string | null;
  retryCount: number;
  failedAt: string;
  recoveredAt: string | null;
}
