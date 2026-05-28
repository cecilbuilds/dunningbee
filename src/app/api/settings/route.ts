import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, dunningSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const settingsSchema = z.object({
  retryDelay1Hours: z.number().min(1).max(168),
  retryDelay2Hours: z.number().min(1).max(336),
  retryDelay3Hours: z.number().min(1).max(720),
  emailDelay1Hours: z.number().min(1).max(168),
  emailDelay2Hours: z.number().min(1).max(336),
  emailDelay3Hours: z.number().min(1).max(720),
  senderName: z.string().max(100).optional(),
  replyToEmail: z.string().email().optional().or(z.literal("")),
  emailSubject1: z.string().max(200),
  emailSubject2: z.string().max(200),
  emailSubject3: z.string().max(200),
  notifyOnFailure: z.boolean(),
  notifyOnRecovery: z.boolean(),
  notificationEmail: z.string().email().optional().or(z.literal("")),
});

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

  const settings = await db.query.dunningSettings.findFirst({
    where: eq(dunningSettings.accountId, account.id),
  });

  if (!settings) {
    // Return defaults
    return NextResponse.json({
      retryDelay1Hours: 1,
      retryDelay2Hours: 24,
      retryDelay3Hours: 72,
      emailDelay1Hours: 1,
      emailDelay2Hours: 48,
      emailDelay3Hours: 120,
      senderName: "Billing",
      replyToEmail: "",
      emailSubject1: "Your payment didn't go through",
      emailSubject2: "Action needed: please update your card",
      emailSubject3: "Last chance to keep your subscription",
      notifyOnFailure: true,
      notifyOnRecovery: true,
      notificationEmail: account.email,
    });
  }

  return NextResponse.json({
    retryDelay1Hours: settings.retryDelay1Hours,
    retryDelay2Hours: settings.retryDelay2Hours,
    retryDelay3Hours: settings.retryDelay3Hours,
    emailDelay1Hours: settings.emailDelay1Hours,
    emailDelay2Hours: settings.emailDelay2Hours,
    emailDelay3Hours: settings.emailDelay3Hours,
    senderName: settings.senderName ?? "Billing",
    replyToEmail: settings.replyToEmail ?? "",
    emailSubject1: settings.emailSubject1,
    emailSubject2: settings.emailSubject2,
    emailSubject3: settings.emailSubject3,
    notifyOnFailure: settings.notifyOnFailure,
    notifyOnRecovery: settings.notifyOnRecovery,
    notificationEmail: settings.notificationEmail ?? "",
  });
}

export async function PUT(request: NextRequest) {
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

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Upsert settings
  const existing = await db.query.dunningSettings.findFirst({
    where: eq(dunningSettings.accountId, account.id),
  });

  if (existing) {
    await db
      .update(dunningSettings)
      .set({
        retryDelay1Hours: data.retryDelay1Hours,
        retryDelay2Hours: data.retryDelay2Hours,
        retryDelay3Hours: data.retryDelay3Hours,
        emailDelay1Hours: data.emailDelay1Hours,
        emailDelay2Hours: data.emailDelay2Hours,
        emailDelay3Hours: data.emailDelay3Hours,
        senderName: data.senderName,
        replyToEmail: data.replyToEmail || null,
        emailSubject1: data.emailSubject1,
        emailSubject2: data.emailSubject2,
        emailSubject3: data.emailSubject3,
        notifyOnFailure: data.notifyOnFailure,
        notifyOnRecovery: data.notifyOnRecovery,
        notificationEmail: data.notificationEmail || null,
        updatedAt: new Date(),
      })
      .where(eq(dunningSettings.id, existing.id));
  } else {
    await db.insert(dunningSettings).values({
      accountId: account.id,
      retryDelay1Hours: data.retryDelay1Hours,
      retryDelay2Hours: data.retryDelay2Hours,
      retryDelay3Hours: data.retryDelay3Hours,
      emailDelay1Hours: data.emailDelay1Hours,
      emailDelay2Hours: data.emailDelay2Hours,
      emailDelay3Hours: data.emailDelay3Hours,
      senderName: data.senderName,
      replyToEmail: data.replyToEmail || null,
      emailSubject1: data.emailSubject1,
      emailSubject2: data.emailSubject2,
      emailSubject3: data.emailSubject3,
      notifyOnFailure: data.notifyOnFailure,
      notifyOnRecovery: data.notifyOnRecovery,
      notificationEmail: data.notificationEmail || null,
    });
  }

  return NextResponse.json({ success: true });
}
