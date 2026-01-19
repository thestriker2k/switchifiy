"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          {/* Left: Brand + nav */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="Switchifye" className="h-6 w-auto" />
            </Link>

            <nav className="flex gap-4 text-sm">
              <Link className="hover:underline" href="/dashboard">
                Overview
              </Link>

              <Link className="hover:underline" href="/dashboard/contacts">
                Contacts
              </Link>

              <Link className="hover:underline" href="/dashboard/settings">
                Settings
              </Link>
            </nav>
          </div>

          {/* Right: Sign out */}
          <button
            className="text-sm opacity-80 hover:opacity-100"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
