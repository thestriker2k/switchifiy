// /lib/stripe/server.ts
// Server-side Stripe client (for API routes)

import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Price ID mapping
export const STRIPE_PRICES = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY!,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  },
} as const;

// Map Stripe price IDs to your plan IDs
export function getPlanIdFromPriceId(
  priceId: string,
): "starter" | "pro" | null {
  if (
    priceId === STRIPE_PRICES.starter.monthly ||
    priceId === STRIPE_PRICES.starter.yearly
  ) {
    return "starter";
  }
  if (
    priceId === STRIPE_PRICES.pro.monthly ||
    priceId === STRIPE_PRICES.pro.yearly
  ) {
    return "pro";
  }
  return null;
}
