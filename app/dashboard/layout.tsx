"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import { Plus_Jakarta_Sans } from "next/font/google";

// ============================================================================
// FONT
// ============================================================================

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
});

// ============================================================================
// NAV ITEMS
// ============================================================================

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Contacts",
    href: "/dashboard/contacts",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// ============================================================================
// LAYOUT COMPONENT
// ============================================================================

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Check if a nav item is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <SubscriptionProvider>
      <div className={`min-h-screen bg-gray-50 ${plusJakarta.className}`}>
        {/* ================================================================ */}
        {/* NAVIGATION BAR */}
        {/* ================================================================ */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex h-16 items-center justify-between">
              {/* Left: Logo + Nav */}
              <div className="flex items-center gap-8">
                {/* Logo */}
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-2 group"
                >
                  <img 
                    src="/logo.png" 
                    alt="Switchifye" 
                    className="h-7 w-auto transition-transform group-hover:scale-105" 
                  />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                  {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                          transition-all duration-200 ease-out
                          ${active 
                            ? "text-gray-900" 
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/70"
                          }
                        `}
                      >
                        <span className={`transition-colors ${active ? "text-[#3EEBBE]" : ""}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                        
                        {/* Active indicator - gradient underline */}
                        {active && (
                          <span 
                            className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                            style={{
                              background: "linear-gradient(90deg, #3B82F6, #3EEBBE)",
                            }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                {/* Sign Out Button - Desktop */}
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="
                    hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg
                    text-sm font-medium text-gray-500
                    hover:text-gray-900 hover:bg-gray-100/70
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {signingOut ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  )}
                  <span className="font-semibold">{signingOut ? "Signing Out..." : "Sign Out"}</span>
                </button>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100/70 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 border-t border-gray-100">
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                          transition-all duration-200
                          ${active 
                            ? "bg-gradient-to-r from-blue-50 to-teal-50 text-gray-900" 
                            : "text-gray-600 hover:bg-gray-50"
                          }
                        `}
                      >
                        <span className={active ? "text-[#3EEBBE]" : "text-gray-400"}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                        {active && (
                          <span 
                            className="ml-auto w-1.5 h-1.5 rounded-full"
                            style={{
                              background: "linear-gradient(135deg, #3B82F6, #3EEBBE)",
                            }}
                          />
                        )}
                      </Link>
                    );
                  })}
                  
                  {/* Mobile Sign Out */}
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                      text-gray-600 hover:bg-gray-50
                      transition-all duration-200 mt-2 pt-4 border-t border-gray-100
                      disabled:opacity-50
                    "
                  >
                    {signingOut ? (
                      <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    )}
                    <span className="font-semibold">{signingOut ? "Signing Out..." : "Sign Out"}</span>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </header>

        {/* ================================================================ */}
        {/* MAIN CONTENT */}
        {/* ================================================================ */}
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {children}
        </main>
      </div>
    </SubscriptionProvider>
  );
}
