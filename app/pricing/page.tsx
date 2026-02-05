"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// ============================================================================
// PLAN DATA (shared with settings page)
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
      "Email notifications",
      "Community support",
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
    features: [
      "5 switches",
      "10 contacts",
      "Email notifications",
      "Custom intervals",
      "Email support",
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
    popular: true,
    features: [
      "25 switches",
      "50 contacts",
      "Everything in Starter",
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
  check: (
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
        d="M5 13l4 4L19 7"
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
  shield: (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
  clock: (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  heart: (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  ),
};

// ============================================================================
// TOGGLE COMPONENT
// ============================================================================

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label ?? (checked ? "On" : "Off")}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200",
        checked ? "bg-gradient-to-r from-blue-500 to-[#3EEBBE]" : "bg-gray-200",
        "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

// ============================================================================
// FAQ DATA
// ============================================================================

const FAQS = [
  {
    question: "What is a deadman switch?",
    answer:
      "A deadman switch is a safety mechanism that automatically triggers an action if you don't check in within a specified time period. With Switchifye, this means sending pre-written messages to your loved ones if something happens to you.",
  },
  {
    question: "How does Switchifye work?",
    answer:
      "You create switches with custom check-in intervals (daily, weekly, monthly, etc.). If you don't check in before the timer expires, Switchifye automatically sends your pre-written messages to your designated contacts.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes! You can cancel your subscription at any time. You'll retain access to your paid features until the end of your billing period, then automatically switch to the Free plan.",
  },
  {
    question: "What happens to my switches if I downgrade?",
    answer:
      "If you downgrade and have more switches or contacts than your new plan allows, you'll need to remove some to stay within limits. Your data is never deleted automatically.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We use industry-standard encryption for all data at rest and in transit. Your messages are stored securely and only sent to your designated recipients when a switch triggers.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We offer a full refund within 14 days of your first payment if you're not satisfied. Contact support@switchifye.com and we'll process it right away.",
  },
];

// ============================================================================
// PRICING PAGE
// ============================================================================

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/icon.png"
                alt="Switchifye"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-semibold text-gray-900">Switchifye</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Peace of mind shouldn't break the bank. Start free, upgrade when you need more.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span
              className={`text-sm font-medium ${!isYearly ? "text-gray-900" : "text-gray-500"}`}
            >
              Monthly
            </span>
            <Toggle
              checked={isYearly}
              onChange={setIsYearly}
              label="Toggle yearly billing"
            />
            <span
              className={`text-sm font-medium ${isYearly ? "text-gray-900" : "text-gray-500"}`}
            >
              Yearly
            </span>
            {isYearly && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-200">
                Save ~17%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {PLANS.filter((p) => p.id !== "enterprise").map((plan) => (
              <div
                key={plan.id}
                className={`relative border rounded-2xl p-6 lg:p-8 flex flex-col transition-all duration-200 ${
                  plan.popular
                    ? "ring-2 ring-[#3EEBBE] shadow-xl shadow-[#3EEBBE]/10 border-[#3EEBBE] scale-105 z-10"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-lg bg-white"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-[#3EEBBE] text-white text-sm font-semibold rounded-full shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  {plan.priceMonthly === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        Free
                      </span>
                      <span className="text-gray-500">forever</span>
                    </div>
                  ) : isYearly ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-gray-900">
                          ${plan.priceYearly}
                        </span>
                        <span className="text-gray-500">/year</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        ${Math.round(plan.priceYearly / 12)}/month billed
                        annually
                      </p>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.priceMonthly}
                      </span>
                      <span className="text-gray-500">/month</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-gray-600"
                    >
                      <span className="text-[#3EEBBE] flex-shrink-0 mt-0.5">
                        {Icons.check}
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`w-full py-3.5 text-sm font-semibold rounded-xl text-center transition-all duration-200 block ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-500 to-[#3EEBBE] text-white hover:shadow-lg hover:shadow-[#3EEBBE]/25"
                      : plan.priceMonthly === 0
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {plan.priceMonthly === 0 ? "Start Free" : "Get Started"}
                </Link>
              </div>
            ))}
          </div>

          {/* Enterprise CTA */}
          <div className="mt-12 border border-gray-200 rounded-2xl p-6 lg:p-8 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500/10 to-[#3EEBBE]/10 rounded-xl">
                  {Icons.sparkles}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Need a custom solution?
                  </h3>
                  <p className="text-gray-500 mt-1 max-w-lg">
                    Get unlimited switches, custom branding, dedicated support,
                    and SLA guarantees for your organization.
                  </p>
                </div>
              </div>
              <a
                href="mailto:support@switchifye.com?subject=Enterprise%20Inquiry"
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all whitespace-nowrap"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need for peace of mind
            </h2>
            <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
              All plans include these essential features to keep your loved ones informed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="p-3 bg-blue-50 rounded-xl w-fit mb-4">
                <span className="text-blue-600">{Icons.shield}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Secure & Private
              </h3>
              <p className="text-sm text-gray-500">
                Your messages are encrypted and only sent to your designated
                recipients. We never read or share your data.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-4">
                <span className="text-emerald-600">{Icons.clock}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Flexible Intervals
              </h3>
              <p className="text-sm text-gray-500">
                Set check-in intervals from 24 hours to 1 year. Get reminders at
                50% and 90% so you never forget.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="p-3 bg-rose-50 rounded-xl w-fit mb-4">
                <span className="text-rose-600">{Icons.heart}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Personalized Messages
              </h3>
              <p className="text-sm text-gray-500">
                Write custom messages for each recipient with personalization
                tokens. Make every message meaningful.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-gray-500">
              Everything you need to know about Switchifye.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === idx ? null : idx)
                  }
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedFaq === idx ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-500 text-sm">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-gray-300 max-w-2xl mx-auto">
            Create your first switch in minutes. No credit card required for the
            Free plan.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-3.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Start Free
            </Link>
            <a
              href="mailto:support@switchifye.com"
              className="px-8 py-3.5 border border-gray-600 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/icon.png"
                alt="Switchifye"
                width={24}
                height={24}
                className="rounded-lg"
              />
              <span className="text-sm text-gray-500">
                © {new Date().getFullYear()} Switchifye. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="mailto:support@switchifye.com"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Support
              </a>
              <Link
                href="/privacy"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
