"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook that checks for pending plan checkout after OAuth login.
 * Returns true if redirecting to checkout, false otherwise.
 * Use this at the top of dashboard to intercept new signups with plan selection.
 */
export function usePendingCheckout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check localStorage for plan selection (set by login page before OAuth)
    const plan = localStorage.getItem("signup_plan");
    const billing = localStorage.getItem("signup_billing") || "yearly";

    // Clear localStorage regardless
    localStorage.removeItem("signup_plan");
    localStorage.removeItem("signup_billing");

    // If user selected a paid plan, redirect to checkout
    if (plan && plan !== "free") {
      console.log("Pending checkout detected, redirecting to:", plan, billing);
      router.replace(`/api/stripe/checkout-redirect?plan=${plan}&billing=${billing}`);
      return;
    }

    setChecking(false);
  }, [router]);

  return checking;
}
