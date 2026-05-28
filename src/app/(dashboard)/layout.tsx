import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  BarChart3,
  Settings,
  List,
  LogOut,
  Zap,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/sequences", label: "Sequences", icon: List },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-void flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-surface-border bg-surface flex flex-col">
        <div className="h-16 px-6 flex items-center gap-2 border-b border-surface-border">
          <span className="text-xl">🐝</span>
          <span className="font-bold text-white">DunningBee</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-overlay transition-colors"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}

          {/* Stripe Connect CTA */}
          <Link
            href="/api/stripe/connect"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand hover:bg-brand/10 transition-colors mt-4"
          >
            <Zap size={18} />
            Connect Stripe
          </Link>
        </nav>

        <div className="px-3 py-4 border-t border-surface-border">
          <div className="px-3 py-2 text-sm text-gray-500 truncate">
            {user.email}
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="button"
              onClick={async () => {
                "use server";
                const supabase = await createClient();
                await supabase.auth.signOut();
                redirect("/");
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-overlay transition-colors w-full"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
