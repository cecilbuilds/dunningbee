# 🐝 DunningBee

**Recover failed payments automatically. Starting at $19/mo.**

DunningBee monitors your Stripe account for failed payments, automatically retries charges at optimal intervals, and sends a proven 3-email dunning sequence to recover revenue. No revenue share — flat monthly pricing.

## Features

- **Smart Retries** — Automatic payment retries at 1hr, 24hr, 72hr intervals
- **3-Email Dunning Sequence** — Friendly reminder → Card update → Last chance
- **Recovery Dashboard** — Track recovered revenue, active sequences, recovery rate
- **Customizable** — Email templates, retry timing, sender info, notifications
- **Stripe Connect** — OAuth integration, webhook-driven, real-time processing
- **Flat Pricing** — $19/$39/$79 per month, no revenue share ever

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Auth:** Supabase Auth (email/password + magic link)
- **Database:** Supabase Postgres + Drizzle ORM
- **Payments:** Stripe Connect (OAuth + webhooks)
- **Email:** Resend
- **Styling:** Tailwind CSS + shadcn/ui patterns
- **Language:** TypeScript throughout

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Stripe account with Connect enabled
- A Resend account

### 1. Clone & Install

```bash
cd dunningbee
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | Direct Postgres connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect platform client ID |
| `STRIPE_PRICE_STARTER` | Stripe Price ID for $19/mo tier |
| `STRIPE_PRICE_GROWTH` | Stripe Price ID for $39/mo tier |
| `STRIPE_PRICE_SCALE` | Stripe Price ID for $79/mo tier |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender email |
| `NEXT_PUBLIC_APP_URL` | App URL (http://localhost:3000 for dev) |

### 3. Database Setup

Run the migration against your Supabase database:

```bash
# Option A: Use Drizzle
npx drizzle-kit push

# Option B: Run SQL directly in Supabase SQL editor
# Copy contents of src/lib/db/migrations/0000_init.sql
```

### 4. Stripe Setup

1. Enable Stripe Connect in your Stripe dashboard
2. Set the Connect redirect URI to: `{APP_URL}/api/stripe/connect/callback`
3. Create 3 Products/Prices for Starter ($19), Growth ($39), Scale ($79)
4. Set up a webhook endpoint pointing to `{APP_URL}/api/webhooks/stripe`
5. Subscribe to events: `invoice.payment_failed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── (auth)/                     # Login + Signup pages
│   ├── (dashboard)/                # Protected dashboard routes
│   │   ├── dashboard/page.tsx      # Main dashboard with stats
│   │   ├── sequences/page.tsx      # Active dunning sequences
│   │   └── settings/page.tsx       # Configuration panel
│   └── api/
│       ├── webhooks/stripe/        # Stripe webhook handler
│       ├── stripe/connect/         # Stripe Connect OAuth flow
│       ├── dashboard/stats/        # Dashboard statistics API
│       ├── retry/                  # Cron-triggered retry processor
│       └── auth/callback/          # Supabase auth callback
├── lib/
│   ├── db/
│   │   ├── schema.ts              # Drizzle ORM schema (7 tables)
│   │   ├── index.ts               # DB client
│   │   └── migrations/            # SQL migrations
│   ├── dunning/
│   │   └── engine.ts              # Core retry + email logic
│   ├── supabase/                   # Supabase client helpers
│   ├── stripe.ts                   # Stripe config + pricing
│   ├── resend.ts                   # Email client
│   └── utils.ts                    # Formatting helpers
├── middleware.ts                    # Auth protection middleware
└── types/index.ts                  # TypeScript types
```

## How It Works

1. **User connects Stripe** via OAuth (Stripe Connect)
2. **Webhook fires** when `invoice.payment_failed` event occurs
3. **Engine creates** a failed payment record + dunning sequence
4. **Smart retries** attempt payment at configured intervals (default: 1hr, 24hr, 72hr)
5. **Dunning emails** send at configured delays (default: 1hr, 48hr, 120hr)
6. **On recovery**, the system marks the payment as recovered and logs the event
7. **Dashboard** shows real-time stats: recovered revenue, active sequences, recovery rate

## Pricing Tiers

| Feature | Starter ($19) | Growth ($39) | Scale ($79) |
|---------|:---:|:---:|:---:|
| Failed payments/mo | 100 | 500 | Unlimited |
| 3-email sequence | ✓ | ✓ | ✓ |
| Smart retries | ✓ | ✓ | ✓ |
| Custom templates | — | ✓ | ✓ |
| A/B testing | — | — | ✓ |
| API access | — | — | ✓ |

## Production Deployment

1. Deploy to Vercel (recommended for Next.js)
2. Set all environment variables in Vercel dashboard
3. Set up Vercel Cron to hit `/api/retry` every 5 minutes
4. Point your domain and update `NEXT_PUBLIC_APP_URL`
5. Switch Stripe keys from test to live mode

## License

MIT
