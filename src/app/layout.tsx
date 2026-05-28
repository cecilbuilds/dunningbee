import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DunningBee — Recover Failed Payments Automatically",
  description:
    "Stop losing revenue to failed payments. DunningBee automatically retries charges and sends smart dunning emails to recover your MRR. Starting at $19/mo.",
  openGraph: {
    title: "DunningBee — Recover Failed Payments",
    description: "Stop losing 9% of your MRR to failed payments.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-void text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
