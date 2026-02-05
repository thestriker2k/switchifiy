"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for plan selection (set by login page before OAuth)
    const plan = localStorage.getItem("signup_plan");
    const billing = localStorage.getItem("signup_billing") || "yearly";

    // Clear localStorage
    localStorage.removeItem("signup_plan");
    localStorage.removeItem("signup_billing");

    // If user selected a paid plan, redirect to checkout
    if (plan && plan !== "free") {
      router.replace(`/api/stripe/checkout-redirect?plan=${plan}&billing=${billing}`);
      return;
    }

    // Default: redirect to dashboard
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
