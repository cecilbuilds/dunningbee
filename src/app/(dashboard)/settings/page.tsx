"use client";

import { useState, useEffect } from "react";
import { Save, Clock, Mail, Bell, Zap } from "lucide-react";

interface SettingsData {
  retryDelay1Hours: number;
  retryDelay2Hours: number;
  retryDelay3Hours: number;
  emailDelay1Hours: number;
  emailDelay2Hours: number;
  emailDelay3Hours: number;
  senderName: string;
  replyToEmail: string;
  emailSubject1: string;
  emailSubject2: string;
  emailSubject3: string;
  notifyOnFailure: boolean;
  notifyOnRecovery: boolean;
  notificationEmail: string;
}

const DEFAULT_SETTINGS: SettingsData = {
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
  notificationEmail: "",
};

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface border border-surface-border">
      <div className="px-6 py-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
            <Icon size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  suffix,
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-void border border-surface-border text-white placeholder:text-gray-600 focus:outline-none focus:border-brand/50 transition text-sm"
          placeholder={placeholder}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-surface-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(key: keyof SettingsData, value: any) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    // In production: POST to /api/settings
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 mt-1">
            Configure your dunning strategy and notifications
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-void font-semibold rounded-lg hover:bg-brand-400 transition disabled:opacity-50 text-sm"
        >
          <Save size={16} />
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>

      {/* Retry Timing */}
      <SectionCard
        icon={Clock}
        title="Retry Timing"
        description="When to automatically retry failed payments"
      >
        <div className="grid grid-cols-3 gap-4">
          <InputField
            label="1st Retry"
            value={settings.retryDelay1Hours}
            onChange={(v) => update("retryDelay1Hours", parseInt(v) || 0)}
            type="number"
            suffix="hours"
          />
          <InputField
            label="2nd Retry"
            value={settings.retryDelay2Hours}
            onChange={(v) => update("retryDelay2Hours", parseInt(v) || 0)}
            type="number"
            suffix="hours"
          />
          <InputField
            label="3rd Retry"
            value={settings.retryDelay3Hours}
            onChange={(v) => update("retryDelay3Hours", parseInt(v) || 0)}
            type="number"
            suffix="hours"
          />
        </div>
        <p className="text-xs text-gray-600">
          Hours after the initial failure. Smart defaults: 1hr, 24hr, 72hr.
        </p>
      </SectionCard>

      {/* Email Customization */}
      <SectionCard
        icon={Mail}
        title="Email Sequence"
        description="Customize your 3-step dunning emails"
      >
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Sender Name"
            value={settings.senderName}
            onChange={(v) => update("senderName", v)}
            placeholder="Billing"
          />
          <InputField
            label="Reply-To Email"
            value={settings.replyToEmail}
            onChange={(v) => update("replyToEmail", v)}
            placeholder="support@yourcompany.com"
          />
        </div>

        <div className="pt-4 border-t border-surface-border space-y-4">
          <h4 className="text-sm font-medium text-gray-300">Email Subjects</h4>
          <div className="space-y-3">
            <InputField
              label="Step 1: Friendly Reminder"
              value={settings.emailSubject1}
              onChange={(v) => update("emailSubject1", v)}
            />
            <InputField
              label="Step 2: Card Update Request"
              value={settings.emailSubject2}
              onChange={(v) => update("emailSubject2", v)}
            />
            <InputField
              label="Step 3: Last Chance"
              value={settings.emailSubject3}
              onChange={(v) => update("emailSubject3", v)}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-surface-border">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            Email Timing
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <InputField
              label="1st Email"
              value={settings.emailDelay1Hours}
              onChange={(v) => update("emailDelay1Hours", parseInt(v) || 0)}
              type="number"
              suffix="hours"
            />
            <InputField
              label="2nd Email"
              value={settings.emailDelay2Hours}
              onChange={(v) => update("emailDelay2Hours", parseInt(v) || 0)}
              type="number"
              suffix="hours"
            />
            <InputField
              label="3rd Email"
              value={settings.emailDelay3Hours}
              onChange={(v) => update("emailDelay3Hours", parseInt(v) || 0)}
              type="number"
              suffix="hours"
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Hours after initial failure. Defaults: 1hr, 48hr, 120hr (5 days).
          </p>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        icon={Bell}
        title="Notifications"
        description="Stay informed about payment events"
      >
        <Toggle
          label="Failed Payment Alerts"
          description="Get notified when a payment fails"
          checked={settings.notifyOnFailure}
          onChange={(v) => update("notifyOnFailure", v)}
        />
        <Toggle
          label="Recovery Notifications"
          description="Celebrate when a payment is recovered"
          checked={settings.notifyOnRecovery}
          onChange={(v) => update("notifyOnRecovery", v)}
        />
        <InputField
          label="Notification Email"
          value={settings.notificationEmail}
          onChange={(v) => update("notificationEmail", v)}
          placeholder="you@company.com"
        />
      </SectionCard>

      {/* Stripe Connection */}
      <SectionCard
        icon={Zap}
        title="Stripe Connection"
        description="Manage your connected Stripe account"
      >
        <div className="flex items-center justify-between p-4 rounded-lg bg-void border border-surface-border">
          <div>
            <div className="text-sm font-medium text-white">
              Stripe Account
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Connect your Stripe account to start monitoring payments
            </div>
          </div>
          <a
            href="/api/stripe/connect"
            className="px-4 py-2 bg-brand text-void text-sm font-semibold rounded-lg hover:bg-brand-400 transition"
          >
            Connect
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
