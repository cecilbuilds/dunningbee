"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "ready" | "updating" | "success" | "error" | "invalid";

function UpdateCardContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoice");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!invoiceId) {
      setStatus("invalid");
      return;
    }
    fetch(`/api/update-card/validate?invoice=${invoiceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setStatus("ready");
        } else {
          setStatus("invalid");
          setErrorMessage(data.message || "This link is no longer valid.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Unable to verify this link. Please try again.");
      });
  }, [invoiceId]);

  const handleUpdateCard = async () => {
    setStatus("updating");
    try {
      const res = await fetch("/api/update-card/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to create update session.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="p-8 rounded-2xl bg-surface border border-surface-border">
      {status === "loading" && (
        <div className="text-center py-8">
          <Loader2 size={32} className="text-brand animate-spin mx-auto" />
          <p className="mt-4 text-gray-400">Verifying your link...</p>
        </div>
      )}

      {status === "invalid" && (
        <div className="text-center py-8">
          <AlertCircle size={32} className="text-red-400 mx-auto" />
          <p className="mt-4 text-gray-300 font-medium">
            {errorMessage || "This link is invalid or has expired."}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            If you believe this is an error, please contact the merchant.
          </p>
        </div>
      )}

      {status === "ready" && (
        <div className="text-center">
          <CreditCard size={48} className="text-brand mx-auto mb-4" />
          <p className="text-gray-300 mb-6">
            Your recent payment failed. Update your card to keep your
            subscription active.
          </p>
          <button
            onClick={handleUpdateCard}
            className="w-full py-3 px-6 bg-brand text-void font-semibold rounded-xl hover:bg-brand-400 transition flex items-center justify-center gap-2"
          >
            <CreditCard size={18} />
            Update Card
          </button>
          <p className="mt-4 text-xs text-gray-500">
            You&apos;ll be redirected to a secure Stripe page to update your
            payment method.
          </p>
        </div>
      )}

      {status === "updating" && (
        <div className="text-center py-8">
          <Loader2 size={32} className="text-brand animate-spin mx-auto" />
          <p className="mt-4 text-gray-400">
            Redirecting to secure payment page...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-400" />
          </div>
          <p className="mt-4 text-green-300 font-medium">
            Payment method updated!
          </p>
          <p className="mt-2 text-sm text-gray-400">
            We&apos;ll retry your payment shortly. You can close this page.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center py-8">
          <AlertCircle size={32} className="text-red-400 mx-auto" />
          <p className="mt-4 text-gray-300">{errorMessage}</p>
          <button
            onClick={() => setStatus("ready")}
            className="mt-4 text-sm text-brand hover:text-brand-400 transition"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export default function UpdateCardPage() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <span className="text-4xl">🐝</span>
          <h1 className="text-2xl font-bold text-white mt-4">
            Update Your Payment Method
          </h1>
        </div>

        <Suspense
          fallback={
            <div className="p-8 rounded-2xl bg-surface border border-surface-border text-center py-8">
              <Loader2 size={32} className="text-brand animate-spin mx-auto" />
              <p className="mt-4 text-gray-400">Loading...</p>
            </div>
          }
        >
          <UpdateCardContent />
        </Suspense>

        <p className="text-center text-xs text-gray-600 mt-6">
          Powered by DunningBee · Secure payments via Stripe
        </p>
      </div>
    </div>
  );
}
