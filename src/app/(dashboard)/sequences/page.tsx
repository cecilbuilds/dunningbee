"use client";

import { useEffect, useState } from "react";
import { Activity, Mail, CheckCircle, XCircle, Clock } from "lucide-react";

interface Sequence {
  id: string;
  status: string;
  currentStep: string;
  startedAt: string;
  customerEmail: string;
  customerName: string | null;
  amountCents: number;
  currency: string;
  emails: {
    step: string;
    status: string;
    scheduledFor: string;
    sentAt: string | null;
  }[];
}

function StepIcon({ step, status }: { step: string; status: string }) {
  if (status === "sent" || status === "delivered" || status === "opened") {
    return <CheckCircle size={16} className="text-brand" />;
  }
  if (status === "failed" || status === "bounced") {
    return <XCircle size={16} className="text-red-400" />;
  }
  return <Clock size={16} className="text-gray-500" />;
}

const stepLabels: Record<string, string> = {
  friendly_reminder: "Friendly Reminder",
  card_update: "Card Update Request",
  last_chance: "Last Chance",
};

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, this would fetch from an API endpoint
    // For now, we show the empty state
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-surface rounded w-48" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-surface rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dunning Sequences</h1>
        <p className="text-gray-500 mt-1">
          Active and completed email recovery sequences
        </p>
      </div>

      {sequences.length === 0 ? (
        <div className="rounded-xl bg-surface border border-surface-border p-12 text-center">
          <Activity size={48} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            No active sequences
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            When a payment fails, DunningBee automatically creates a dunning
            sequence with 3 emails. They&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className="rounded-xl bg-surface border border-surface-border overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">
                    {seq.customerName ?? seq.customerEmail}
                  </div>
                  <div className="text-sm text-gray-500">
                    {seq.customerEmail} ·{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: seq.currency,
                    }).format(seq.amountCents / 100)}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    seq.status === "active"
                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      : seq.status === "recovered"
                      ? "bg-brand/10 text-brand border border-brand/20"
                      : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                  }`}
                >
                  {seq.status}
                </span>
              </div>

              {/* Timeline */}
              <div className="px-6 py-4">
                <div className="space-y-3">
                  {seq.emails.map((email, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <StepIcon step={email.step} status={email.status} />
                      <div className="flex-1">
                        <div className="text-sm text-white">
                          {stepLabels[email.step] ?? email.step}
                        </div>
                        <div className="text-xs text-gray-500">
                          {email.sentAt
                            ? `Sent ${new Date(email.sentAt).toLocaleDateString()}`
                            : `Scheduled ${new Date(email.scheduledFor).toLocaleDateString()}`}
                          {" · "}
                          {email.status}
                        </div>
                      </div>
                      <Mail
                        size={14}
                        className={
                          email.status === "sent" || email.status === "delivered"
                            ? "text-brand"
                            : "text-gray-600"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
