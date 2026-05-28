import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  accounts,
  failedPayments,
  dunningSequences,
  recoveryEvents,
} from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.userId, user.id),
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Total revenue lost (all time)
  const [totalLost] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${failedPayments.amountCents}), 0)`,
    })
    .from(failedPayments)
    .where(eq(failedPayments.accountId, account.id));

  // Total recovered (all time)
  const [totalRecovered] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${recoveryEvents.amountCents}), 0)`,
    })
    .from(recoveryEvents)
    .where(eq(recoveryEvents.accountId, account.id));

  // Active sequences
  const [activeSeqs] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(dunningSequences)
    .where(
      and(
        eq(dunningSequences.accountId, account.id),
        eq(dunningSequences.status, "active")
      )
    );

  // Failed payments last 30 days
  const [failed30d] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(failedPayments)
    .where(
      and(
        eq(failedPayments.accountId, account.id),
        gte(failedPayments.failedAt, thirtyDaysAgo)
      )
    );

  // Recovered payments last 30 days
  const [recovered30d] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(recoveryEvents)
    .where(
      and(
        eq(recoveryEvents.accountId, account.id),
        gte(recoveryEvents.recoveredAt, thirtyDaysAgo)
      )
    );

  // Recent failed payments
  const recentPayments = await db.query.failedPayments.findMany({
    where: eq(failedPayments.accountId, account.id),
    orderBy: (fp, { desc }) => [desc(fp.failedAt)],
    limit: 20,
  });

  const totalLostAmount = Number(totalLost.total);
  const totalRecoveredAmount = Number(totalRecovered.total);
  const recoveryRate =
    totalLostAmount > 0 ? totalRecoveredAmount / totalLostAmount : 0;

  return NextResponse.json({
    totalRevenueLost: totalLostAmount,
    totalRecovered: totalRecoveredAmount,
    recoveryRate,
    activeSequences: Number(activeSeqs.count),
    failedPayments30d: Number(failed30d.count),
    recoveredPayments30d: Number(recovered30d.count),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      customerEmail: p.customerEmail,
      customerName: p.customerName,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      failureCode: p.failureCode,
      retryCount: p.retryCount,
      failedAt: p.failedAt.toISOString(),
      recoveredAt: p.recoveredAt?.toISOString() ?? null,
    })),
  });
}
