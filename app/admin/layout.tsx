// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // We'll let the API route do the real auth check.
      // This is just a quick client-side gate so the page doesn't flash.
      setAuthorized(true);
      setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className={`min-h-screen bg-gray-50 ${plusJakarta.className}`}>
      {/* Admin header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="Switchifye"
                  className="h-6 w-auto"
                />
                <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Admin
                </span>
              </Link>
            </div>

            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
