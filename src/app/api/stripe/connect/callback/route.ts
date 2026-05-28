import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { stripeConnections, accounts, dunningSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=stripe_connect_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_params`
    );
  }

  // Verify state
  const storedState = request.cookies.get("stripe_connect_state")?.value;
  if (state !== storedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_state`
    );
  }

  const accountId = state.split(":")[0];

  try {
    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    // Save connection
    await db.insert(stripeConnections).values({
      accountId,
      stripeAccountId: response.stripe_user_id!,
      accessToken: response.access_token!,
      refreshToken: response.refresh_token ?? null,
      livemode: response.livemode ?? false,
      scope: response.scope ?? null,
    });

    // Create default dunning settings if they don't exist
    const existingSettings = await db.query.dunningSettings.findFirst({
      where: eq(dunningSettings.accountId, accountId),
    });

    if (!existingSettings) {
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
      });

      await db.insert(dunningSettings).values({
        accountId,
        notificationEmail: account?.email ?? null,
      });
    }

    // Mark onboarding as complete
    await db
      .update(accounts)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(accounts.id, accountId));

    // Register webhook endpoint on the connected account
    // In production, you'd create a webhook endpoint here

    const redirectResponse = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=stripe_connected`
    );
    redirectResponse.cookies.delete("stripe_connect_state");

    return redirectResponse;
  } catch (err) {
    console.error("Stripe Connect callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=stripe_connect_failed`
    );
  }
}
