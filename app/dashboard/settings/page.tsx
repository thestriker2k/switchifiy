"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";

// ============================================================================
// PLAN DATA
// ============================================================================

type PlanTier = "free" | "starter" | "pro" | "enterprise";

type Plan = {
  id: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxSwitches: number;
  maxRecipients: number;
  features: string[];
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for trying out Switchifye",
    priceMonthly: 0,
    priceYearly: 0,
    maxSwitches: 1,
    maxRecipients: 2,
    features: [
      "1 switch",
      "2 contacts",
      "Monthly & yearly check-ins",
      "Email notifications",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For individuals who need more",
    priceMonthly: 5,
    priceYearly: 50,
    maxSwitches: 5,
    maxRecipients: 10,
    popular: true,
    features: [
      "5 switches",
      "10 contacts",
      "Daily, weekly, monthly & yearly check-ins",
      "Email notifications",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For power users",
    priceMonthly: 9,
    priceYearly: 90,
    maxSwitches: 25,
    maxRecipients: 50,
    features: [
      "25 switches",
      "50 contacts",
      "Daily, weekly, monthly & yearly check-ins",
      "Email notifications",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for organizations",
    priceMonthly: 0,
    priceYearly: 0,
    maxSwitches: -1,
    maxRecipients: -1,
    features: [
      "Unlimited switches",
      "Unlimited contacts",
      "Everything in Pro",
      "Custom branding",
      "Dedicated support",
      "SLA",
    ],
  },
];

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  bell: (
    <svg
      className="w-5 h-5 text-teal-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  creditCard: (
    <svg
      className="w-5 h-5 text-blue-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  user: (
    <svg
      className="w-5 h-5 text-gray-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  trash: (
    <svg
      className="w-5 h-5 text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  check: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  error: (
    <svg
      className="w-5 h-5 text-red-500 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  success: (
    <svg
      className="w-5 h-5 text-emerald-500 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  close: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
  sparkles: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  ),
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label ?? (checked ? "On" : "Off")}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200",
        checked ? "bg-gradient-to-r from-blue-500 to-[#3EEBBE]" : "bg-gray-200",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isAtLimit = !isUnlimited && used >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{label}</span>
        <span
          className={`font-semibold ${isAtLimit ? "text-red-600" : "text-gray-900"}`}
        >
          {used} / {isUnlimited ? "∞" : limit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isAtLimit
              ? "bg-red-500"
              : "bg-gradient-to-r from-blue-500 to-[#3EEBBE]"
          }`}
          style={{ width: isUnlimited ? "0%" : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "popular";
}) {
  const variants = {
    default: "bg-gray-100 text-gray-700 border border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    popular: "bg-gray-900 text-white border border-gray-900",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
  variant = "default",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
        variant === "danger" ? "border-red-200" : "border-gray-100"
      }`}
    >
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${variant === "danger" ? "bg-red-50" : "bg-gray-100"}`}
          >
            {icon}
          </div>
          <div>
            <h2
              className={`font-semibold ${variant === "danger" ? "text-red-600" : "text-gray-900"}`}
            >
              {title}
            </h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ============================================================================
// DOWNGRADE MODAL
// ============================================================================

function DowngradeModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  currentPlanName,
  periodEndDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  currentPlanName: string;
  periodEndDate: string | null;
}) {
  if (!isOpen) return null;

  const formattedDate = periodEndDate
    ? new Date(periodEndDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "the end of your billing period";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Downgrade to Free?
              </h2>
              <p className="text-sm text-gray-500">
                Cancel your {currentPlanName} subscription
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            You'll keep access to all {currentPlanName} features until{" "}
            <span className="font-semibold text-gray-900">{formattedDate}</span>
            . After that, your account will switch to the Free plan.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-gray-900">
              On the Free plan, you'll have:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />1
                switch (instead of {currentPlanName === "Starter" ? "5" : "25"})
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />2
                contacts (instead of{" "}
                {currentPlanName === "Starter" ? "10" : "50"})
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            If you have more switches or contacts than the Free plan allows,
            you'll need to remove some after downgrading.
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            Keep {currentPlanName}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {loading ? "Canceling..." : "Downgrade to Free"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UPGRADE MODAL
// ============================================================================

function UpgradeModal({
  isOpen,
  onClose,
  currentPlanId,
  onSelectPlan,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId: PlanTier;
  onSelectPlan: (planId: PlanTier, isYearly: boolean) => void;
  loading?: boolean;
}) {
  const [isYearly, setIsYearly] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Choose Your Plan
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select the plan that works best for you
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              aria-label="Close"
            >
              {Icons.close}
            </button>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <span
              className={`text-sm ${!isYearly ? "text-gray-900 font-medium" : "text-gray-500"}`}
            >
              Monthly
            </span>
            <Toggle
              checked={isYearly}
              onChange={setIsYearly}
              label="Toggle yearly billing"
            />
            <span
              className={`text-sm ${isYearly ? "text-gray-900 font-medium" : "text-gray-500"}`}
            >
              Yearly
            </span>
            {isYearly && (
              <span className="ml-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-200">
                Save ~17%
              </span>
            )}
          </div>
        </div>

        {/* Plans grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.filter((p) => p.id !== "enterprise").map((plan) => {
              const isCurrentPlan = plan.id === currentPlanId;
              const currentIndex = PLANS.findIndex(
                (p) => p.id === currentPlanId,
              );
              const planIndex = PLANS.findIndex((p) => p.id === plan.id);
              const isDowngrade = planIndex < currentIndex;

              return (
                <div
                  key={plan.id}
                  className={`border rounded-2xl p-5 flex flex-col transition-all duration-200 ${
                    plan.popular
                      ? "ring-2 ring-[#3EEBBE] relative shadow-lg border-[#3EEBBE]"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                  } ${isCurrentPlan ? "bg-gray-50" : "bg-white"}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-[#3EEBBE] text-white text-xs font-semibold rounded-full shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-4">
                    {isYearly ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-gray-900">
                            ${plan.priceYearly}
                          </span>
                          <span className="text-gray-500">/year</span>
                        </div>
                        {plan.priceMonthly > 0 && (
                          <p className="text-xs text-gray-400 mt-1 line-through">
                            ${plan.priceMonthly * 12}/year at monthly price
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">
                          ${plan.priceMonthly}
                        </span>
                        <span className="text-gray-500">/month</span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <span className="text-[#3EEBBE] mt-0.5">
                          {Icons.check}
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onSelectPlan(plan.id, isYearly)}
                    disabled={loading || isCurrentPlan}
                    className={`w-full py-3 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 ${
                      plan.popular && !isCurrentPlan
                        ? "bg-gradient-to-r from-blue-500 to-[#3EEBBE] text-white hover:shadow-lg hover:shadow-[#3EEBBE]/25"
                        : isCurrentPlan
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    {isCurrentPlan
                      ? "Current Plan"
                      : isDowngrade
                        ? "Downgrade"
                        : plan.priceMonthly === 0
                          ? "Get Started"
                          : "Upgrade"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Enterprise CTA */}
          <div className="mt-6 border border-gray-200 rounded-2xl p-5 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/10 to-[#3EEBBE]/10 rounded-xl">
                  <svg
                    className="w-5 h-5 text-[#3EEBBE]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Need a custom solution?
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Get unlimited switches, custom branding, and dedicated
                    support.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  window.location.href =
                    "mailto:support@switchifye.com?subject=Enterprise%20Inquiry";
                }}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-6 bg-gray-50 rounded-b-2xl">
          <p className="text-center text-sm text-gray-500">
            Cancel anytime. No questions asked.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS PAGE CONTENT
// ============================================================================

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    planId,
    planName,
    maxSwitches,
    maxRecipients,
    switchesUsed,
    recipientsUsed,
  } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // Billing state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);

  // Get current plan details
  const currentPlan = PLANS.find((p) => p.id === planId) ?? PLANS[0];

  // Check for success/canceled from Stripe redirect
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      setSaveNotice("🎉 Subscription activated! Welcome to your new plan.");
      router.replace("/dashboard/settings");
    } else if (canceled === "true") {
      setError("Checkout was canceled. No charges were made.");
      router.replace("/dashboard/settings");
    }
  }, [searchParams, router]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }

      setUserId(auth.user.id);
      setUserEmail(auth.user.email ?? null);

      // Load user settings
      const { data, error } = await supabase
        .from("user_settings")
        .select("reminder_enabled")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setReminderEnabled(data.reminder_enabled ?? true);
      }

      // Load subscription info for period end date
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (subData?.current_period_end) {
        setCurrentPeriodEnd(subData.current_period_end);
      }

      setLoading(false);
    })();
  }, [router]);

  async function handleToggle(next: boolean) {
    if (!userId) return;

    setReminderEnabled(next);
    setError(null);
    setSaveNotice(null);
    setSaving(true);

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        reminder_enabled: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSaveNotice("Settings saved");
    setTimeout(() => setSaveNotice(null), 1500);
  }

  async function handleSelectPlan(selectedPlanId: PlanTier, isYearly: boolean) {
    if (selectedPlanId === planId) return;

    // If downgrading to free, show confirmation modal instead of Stripe
    if (selectedPlanId === "free") {
      setShowUpgradeModal(false);
      setShowDowngradeModal(true);
      return;
    }

    setUpgrading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          isYearly,
          userId,
          userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUpgrading(false);
    }
  }

  async function handleDowngradeToFree() {
    setDowngrading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      setShowDowngradeModal(false);
      setSaveNotice(
        `Your subscription has been canceled. You'll have access to ${planName} features until your billing period ends.`,
      );

      // Refresh the page after a moment to update subscription status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDowngrading(false);
    }
  }

  async function openCustomerPortal() {
    setOpeningPortal(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setOpeningPortal(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-lg w-48" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and subscription
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
          {Icons.error}
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success */}
      {saveNotice && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
          {Icons.success}
          <p className="text-sm text-emerald-700">{saveNotice}</p>
        </div>
      )}

      {/* ================================================================== */}
      {/* NOTIFICATIONS SECTION - Moved to top */}
      {/* ================================================================== */}
      <SectionCard
        icon={Icons.bell}
        title="Notifications"
        description="Configure how and when you receive reminders"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              Check-in reminders
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Receive email reminders at 50% and 90% of your switch interval
              before it triggers.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              For example, a 30 day switch will send you a reminder at 15 days
              and again at 27 days.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Toggle
              checked={reminderEnabled}
              onChange={handleToggle}
              disabled={saving}
              label="Toggle check-in reminders"
            />
          </div>
        </div>
      </SectionCard>

      {/* ================================================================== */}
      {/* BILLING & PLAN SECTION */}
      {/* ================================================================== */}
      <SectionCard
        icon={Icons.creditCard}
        title="Plan & Billing"
        description="Manage your subscription and view usage"
      >
        <div className="space-y-6">
          {/* Current Plan Card */}
          <div className="border border-gray-200 rounded-2xl p-5 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {currentPlan.name} Plan
                  </span>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {currentPlan.description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${currentPlan.priceMonthly}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </div>
              </div>
            </div>

            {/* Plan Features */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {currentPlan.features.slice(0, 4).map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span className="text-emerald-600">{Icons.check}</span>
                  {feature}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              {planId !== "free" && (
                <button
                  onClick={openCustomerPortal}
                  disabled={openingPortal}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                >
                  {openingPortal ? "Opening..." : "Manage Billing"}
                </button>
              )}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all"
              >
                {planId === "free" ? "Upgrade" : "Change Plan"}
              </button>
            </div>
          </div>

          {/* Usage */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Your Usage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageBar
                label="Switches"
                used={switchesUsed}
                limit={maxSwitches}
              />
              <UsageBar
                label="Contacts"
                used={recipientsUsed}
                limit={maxRecipients}
              />
            </div>
          </div>

          {/* Upgrade prompt for free users */}
          {planId === "free" && (
            <div className="border border-gray-800 rounded-2xl p-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Need more switches or contacts?
                  </h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Upgrade to Starter for 5 switches and 10 contacts.
                  </p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-5 py-2.5 bg-white text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-100 transition-all"
                >
                  Upgrade
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ================================================================== */}
      {/* ACCOUNT SECTION */}
      {/* ================================================================== */}
      <SectionCard
        icon={Icons.user}
        title="Account"
        description="Your account information"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-[#3EEBBE] text-white flex items-center justify-center font-semibold text-xl shadow-sm">
            {userEmail?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="font-medium text-gray-900">{userEmail}</div>
            <div className="text-sm text-gray-500">Account email</div>
          </div>
        </div>
      </SectionCard>

      {/* ================================================================== */}
      {/* DANGER ZONE */}
      {/* ================================================================== */}
      <SectionCard
        icon={Icons.trash}
        title="Danger Zone"
        description="Permanently delete your account and all data"
        variant="danger"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Once you delete your account, there is no going back. All your
            switches, contacts, and settings will be permanently removed.
          </p>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to delete your account? This cannot be undone and all your data will be permanently lost.",
                )
              ) {
                // TODO: Implement account deletion
                alert("Account deletion is not yet implemented.");
              }
            }}
            className="px-5 py-2.5 text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-all"
          >
            Delete Account
          </button>
        </div>
      </SectionCard>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlanId={planId}
        onSelectPlan={handleSelectPlan}
        loading={upgrading}
      />

      {/* Downgrade Modal */}
      <DowngradeModal
        isOpen={showDowngradeModal}
        onClose={() => setShowDowngradeModal(false)}
        onConfirm={handleDowngradeToFree}
        loading={downgrading}
        currentPlanName={planName}
        periodEndDate={currentPeriodEnd}
      />
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded-lg w-48" />
            <div className="h-32 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
