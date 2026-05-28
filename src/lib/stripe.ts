import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

/**
 * Create a Stripe client authenticated as a connected account.
 */
export function stripeAsConnected(accessToken: string) {
  return new Stripe(accessToken, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
}

/**
 * Get Stripe Connect OAuth URL
 */
export function getStripeConnectUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
    scope: "read_write",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
    state,
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * DunningBee pricing tiers
 */
export const PRICING = {
  starter: {
    name: "Starter",
    price: 19,
    priceId: process.env.STRIPE_PRICE_STARTER!,
    features: [
      "Up to 100 failed payments/mo",
      "3-email dunning sequence",
      "Smart retry logic",
      "Basic dashboard",
    ],
    maxPayments: 100,
  },
  growth: {
    name: "Growth",
    price: 39,
    priceId: process.env.STRIPE_PRICE_GROWTH!,
    features: [
      "Up to 500 failed payments/mo",
      "Custom email templates",
      "Priority retry windows",
      "Detailed analytics",
      "Slack notifications",
    ],
    maxPayments: 500,
  },
  scale: {
    name: "Scale",
    price: 79,
    priceId: process.env.STRIPE_PRICE_SCALE!,
    features: [
      "Unlimited failed payments",
      "Custom branding",
      "A/B test email sequences",
      "API access",
      "Priority support",
      "Webhook events",
    ],
    maxPayments: Infinity,
  },
} as const;
