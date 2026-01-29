"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export type PlanTier = "free" | "starter" | "pro" | "enterprise";

type Plan = {
  id: PlanTier;
  name: string;
  maxSwitches: number;
  maxRecipients: number;
};

// ============================================================================
// PLAN LIMITS - Must match your database!
// ============================================================================

const PLAN_LIMITS: Record<PlanTier, Plan> = {
  free: { id: "free", name: "Free", maxSwitches: 1, maxRecipients: 2 },
  starter: {
    id: "starter",
    name: "Starter",
    maxSwitches: 5,
    maxRecipients: 10,
  },
  pro: { id: "pro", name: "Pro", maxSwitches: 25, maxRecipients: 50 },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    maxSwitches: -1,
    maxRecipients: -1,
  },
};

// ============================================================================
// CONTEXT
// ============================================================================

type SubscriptionContextType = {
  planId: PlanTier;
  planName: string;
  switchesUsed: number;
  recipientsUsed: number;
  maxSwitches: number;
  maxRecipients: number;
  canCreateSwitch: boolean;
  canAddRecipient: boolean;
  loading: boolean;
  refreshUsage: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [planId, setPlanId] = useState<PlanTier>("free");
  const [switchesUsed, setSwitchesUsed] = useState(0);
  const [recipientsUsed, setRecipientsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const plan = PLAN_LIMITS[planId];

  const loadSubscription = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.plan_id && data.plan_id in PLAN_LIMITS) {
        setPlanId(data.plan_id as PlanTier);
      }
    } catch (err) {
      console.error("Error loading subscription:", err);
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const [switchesResult, recipientsResult] = await Promise.all([
        supabase.from("switches").select("*", { count: "exact", head: true }),
        supabase.from("recipients").select("*", { count: "exact", head: true }),
      ]);

      setSwitchesUsed(switchesResult.count ?? 0);
      setRecipientsUsed(recipientsResult.count ?? 0);
    } catch (err) {
      console.error("Error loading usage:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadSubscription(), refreshUsage()]);
      setLoading(false);
    }
    init();
  }, [loadSubscription, refreshUsage]);

  // Calculate these as values, not functions
  const canCreateSwitch =
    !loading && (plan.maxSwitches === -1 || switchesUsed < plan.maxSwitches);
  const canAddRecipient =
    !loading &&
    (plan.maxRecipients === -1 || recipientsUsed < plan.maxRecipients);

  const value: SubscriptionContextType = {
    planId,
    planName: plan.name,
    switchesUsed,
    recipientsUsed,
    maxSwitches: plan.maxSwitches,
    maxRecipients: plan.maxRecipients,
    canCreateSwitch,
    canAddRecipient,
    loading,
    refreshUsage,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider. " +
        "Wrap your app with <SubscriptionProvider> in layout.tsx",
    );
  }

  return context;
}
