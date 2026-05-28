import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getStripeConnectUrl } from "@/lib/stripe";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create account
  let account = await db.query.accounts.findFirst({
    where: eq(accounts.userId, user.id),
  });

  if (!account) {
    const [newAccount] = await db
      .insert(accounts)
      .values({
        userId: user.id,
        email: user.email!,
      })
      .returning();
    account = newAccount;
  }

  // Generate state token for CSRF protection
  const state = `${account.id}:${randomUUID()}`;

  // Store state in cookie for verification on callback
  const response = NextResponse.redirect(getStripeConnectUrl(state));
  response.cookies.set("stripe_connect_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });

  return response;
}
