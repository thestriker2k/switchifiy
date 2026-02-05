"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Hook that checks for pending plan checkout after OAuth login.
 * Returns true if checking/redirecting, false when done.
 */
export function usePendingCheckout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkPendingCheckout() {
      // Check localStorage for plan selection (set by login page before OAuth)
      const plan = localStorage.getItem("signup_plan");
      const billing = localStorage.getItem("signup_billing") || "yearly";

      // If no plan selected, we're done
      if (!plan || plan === "free") {
        localStorage.removeItem("signup_plan");
        localStorage.removeItem("signup_billing");
        setChecking(false);
        return;
      }

      console.log("Pending checkout detected:", plan, billing);

      // Wait for session to be available
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log("No session yet, waiting...");
        setTimeout(checkPendingCheckout, 500);
        return;
      }

      const user = session.user;
      console.log("Session confirmed for user:", user.id);

      // Clear localStorage
      localStorage.removeItem("signup_plan");
      localStorage.removeItem("signup_billing");

      try {
        // Call the existing POST checkout endpoint directly
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId: plan,
            isYearly: billing === "yearly",
            userId: user.id,
            userEmail: user.email,
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error("Checkout error:", data.error);
          setChecking(false);
          return;
        }

        if (data.url) {
          console.log("Redirecting to Stripe checkout...");
          window.location.href = data.url;
          return;
        }
      } catch (error) {
        console.error("Failed to create checkout session:", error);
      }

      setChecking(false);
    }

    checkPendingCheckout();
  }, []);

  return checking;
}
