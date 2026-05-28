import Link from "next/link";
import { PRICING } from "@/lib/stripe";
import {
  ArrowRight,
  Zap,
  Mail,
  BarChart3,
  Shield,
  Check,
  TrendingUp,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-void">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-border bg-void/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐝</span>
            <span className="text-lg font-bold text-white">DunningBee</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition">
              Pricing
            </a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition">
              How It Works
            </a>
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-brand text-void text-sm font-semibold rounded-lg hover:bg-brand-400 transition"
            >
              Start Recovering
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-medium mb-8">
            <TrendingUp size={14} />
            Recover 30-50% of failed payments automatically
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight">
            Stop losing revenue
            <br />
            to <span className="text-brand">failed payments</span>
          </h1>

          <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            9% of your MRR is lost to failed charges. DunningBee automatically
            retries payments and sends smart dunning emails to recover your
            revenue. Set up in 2 minutes.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group px-8 py-4 bg-brand text-void font-bold text-lg rounded-xl hover:bg-brand-400 transition-all animate-pulse-glow flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <span className="text-sm text-gray-500">
              From $19/mo · No credit card required
            </span>
          </div>

          {/* Social proof */}
          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              $0 recovered so far — be our first customer
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Stats */}
      <section className="py-20 px-6 border-t border-surface-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                stat: "9%",
                label: "of MRR is lost to failed payments industry-wide",
              },
              {
                stat: "$250/mo",
                label: "is what Churnkey charges (plus 25% of recovered revenue)",
              },
              {
                stat: "$19/mo",
                label: "flat fee with DunningBee. No revenue share. Ever.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-surface border border-surface-border"
              >
                <div className="text-4xl font-bold text-brand font-mono">
                  {item.stat}
                </div>
                <p className="mt-3 text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-surface-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">
            How it works
          </h2>

          <div className="space-y-12">
            {[
              {
                icon: <Zap size={24} />,
                title: "1. Connect your Stripe account",
                desc: "One-click OAuth. We listen for failed payment events — that's it.",
              },
              {
                icon: <Mail size={24} />,
                title: "2. We handle the recovery",
                desc: "Smart retries at optimal intervals (1hr, 24hr, 72hr) plus a 3-email dunning sequence that's proven to convert.",
              },
              {
                icon: <BarChart3 size={24} />,
                title: "3. Watch your revenue recover",
                desc: "Real-time dashboard showing recovered revenue, active sequences, and your recovery rate.",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-gray-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-surface-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">
            Everything you need. Nothing you don&apos;t.
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap size={20} />,
                title: "Smart Retries",
                desc: "AI-optimized retry timing based on failure reason and customer behavior.",
              },
              {
                icon: <Mail size={20} />,
                title: "3-Email Sequence",
                desc: "Friendly reminder → card update → last chance. Battle-tested copy that converts.",
              },
              {
                icon: <BarChart3 size={20} />,
                title: "Recovery Dashboard",
                desc: "Track recovered revenue, active sequences, and recovery rate in real time.",
              },
              {
                icon: <Shield size={20} />,
                title: "No Revenue Share",
                desc: "Flat monthly fee. We don't take a cut of your recovered payments. Ever.",
              },
              {
                icon: <Zap size={20} />,
                title: "2-Minute Setup",
                desc: "Connect Stripe, customize your emails, done. No code required.",
              },
              {
                icon: <Mail size={20} />,
                title: "Custom Emails",
                desc: "Customize subjects, timing, and sender name. Match your brand.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-surface border border-surface-border hover:border-brand/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 border-t border-surface-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Simple, flat pricing
          </h2>
          <p className="text-gray-400 text-center mb-16">
            No revenue share. No hidden fees. Cancel anytime.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {(Object.entries(PRICING) as [string, (typeof PRICING)[keyof typeof PRICING]][]).map(
              ([key, tier]) => (
                <div
                  key={key}
                  className={`p-8 rounded-2xl border ${
                    key === "growth"
                      ? "bg-brand/5 border-brand/30 ring-1 ring-brand/20"
                      : "bg-surface border-surface-border"
                  } flex flex-col`}
                >
                  {key === "growth" && (
                    <span className="text-xs font-semibold text-brand uppercase tracking-wider mb-4">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white font-mono">
                      ${tier.price}
                    </span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                  <ul className="mt-8 space-y-3 flex-1">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check size={16} className="text-brand flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-8 block text-center py-3 px-6 rounded-xl font-semibold text-sm transition ${
                      key === "growth"
                        ? "bg-brand text-void hover:bg-brand-400"
                        : "bg-surface-overlay border border-surface-border text-white hover:border-brand/30"
                    }`}
                  >
                    Start Free Trial
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-surface-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Every failed payment is money walking out the door
          </h2>
          <p className="text-gray-400 mb-8">
            Set up DunningBee in 2 minutes and start recovering revenue today.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand text-void font-bold text-lg rounded-xl hover:bg-brand-400 transition"
          >
            Start Free Trial <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-surface-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>🐝</span>
            <span>DunningBee</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="mailto:support@dunningbee.com" className="hover:text-white transition">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
