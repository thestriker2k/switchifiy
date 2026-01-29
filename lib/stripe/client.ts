// /lib/stripe/client.ts
// Client-side Stripe (for redirecting to checkout)

import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);
