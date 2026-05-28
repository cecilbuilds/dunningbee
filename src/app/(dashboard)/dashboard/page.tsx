"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { DashboardStats, FailedPaymentRow } from "@/types";
import { formatCents, formatPercent, timeAgo } from "@/lib/utils";

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: any;
  trend?: "up" | "down";
}) {
  return (
    <div className="p-6 rounded-xl bg-surface border border-surface-border">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
          <Icon size={20} />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              trend === "up" ? "text-brand" : "text-red-400"
            }`}
          >
            {trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {subValue && <div className="text-xs text-gray-600 mt-1">{subValue}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    retrying: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    recovered: "bg-brand/10 text-brand border-brand/20",
    abandoned: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${
        colors[status] ?? colors.failed
      }`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-surface rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-surface rounded-xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">
          Connect your Stripe account
        </h2>
        <p className="text-gray-400 mb-6">
          Once connected, we&apos;ll start monitoring for failed payments
          automatically.
        </p>
        <a
          href="/api/stripe/connect"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-void font-semibold rounded-xl hover:bg-brand-400 transition"
        >
          Connect Stripe <ArrowUpRight size={18} />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your payment recovery overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Recovered"
          value={formatCents(stats.totalRecovered)}
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          label="Recovery Rate"
          value={formatPercent(stats.recoveryRate)}
          icon={TrendingUp}
          trend={stats.recoveryRate > 0.3 ? "up" : "down"}
        />
        <StatCard
          label="Active Sequences"
          value={stats.activeSequences.toString()}
          icon={Activity}
        />
        <StatCard
          label="Failed (30d)"
          value={stats.failedPayments30d.toString()}
          subValue={`${stats.recoveredPayments30d} recovered`}
          icon={AlertCircle}
        />
      </div>

      {/* Revenue Lost Banner */}
      {stats.totalRevenueLost > 0 && (
        <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-400 font-medium">
                Total Revenue At Risk
              </div>
              <div className="text-3xl font-bold text-white font-mono mt-1">
                {formatCents(stats.totalRevenueLost)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-brand font-medium">Recovered</div>
              <div className="text-3xl font-bold text-brand font-mono mt-1">
                {formatCents(stats.totalRecovered)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Failed Payments Table */}
      <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-white">Recent Failed Payments</h2>
        </div>

        {stats.recentPayments.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <Activity size={32} className="mx-auto mb-3 text-gray-600" />
            <p>No failed payments yet. That&apos;s a good thing!</p>
            <p className="text-sm mt-1">
              We&apos;ll start tracking as soon as a payment fails.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {stats.recentPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-surface-overlay transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">
                        {payment.customerName ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.customerEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-white">
                      {formatCents(payment.amountCents, payment.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                      {payment.retryCount}/3
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {timeAgo(new Date(payment.failedAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
