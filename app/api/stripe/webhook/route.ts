// /app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, getPlanIdFromPriceId } from "@/lib/stripe/server";
import Stripe from "stripe";

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ============================================================
      // CHECKOUT COMPLETED - User successfully subscribed
      // ============================================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          const userId = session.metadata?.supabase_user_id;
          const planId = session.metadata?.plan_id;

          if (userId && planId) {
            // Get the subscription details
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );

            await supabase
              .from("subscriptions")
              .update({
                plan_id: planId,
                status: "active",
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscription.id,
                current_period_end: new Date(
                  (subscription as any).current_period_end * 1000
                ).toISOString(),
                cancel_at_period_end: (subscription as any).cancel_at_period_end,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);

            console.log(`✅ Subscription activated for user ${userId}: ${planId}`);
          }
        }
        break;
      }

      // ============================================================
      // SUBSCRIPTION UPDATED - Plan changed, renewed, etc.
      // ============================================================
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get the price ID from the subscription
        const priceId = subscription.items.data[0]?.price.id;
        const planId = priceId ? getPlanIdFromPriceId(priceId) : null;

        // Find the user by their Stripe customer ID
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub?.user_id) {
          await supabase
            .from("subscriptions")
            .update({
              plan_id: planId ?? "free",
              status: subscription.status === "active" ? "active" : subscription.status,
              current_period_end: new Date(
                (subscription as any).current_period_end * 1000
              ).toISOString(),
              cancel_at_period_end: (subscription as any).cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", existingSub.user_id);

          console.log(`✅ Subscription updated for user ${existingSub.user_id}`);
        }
        break;
      }

      // ============================================================
      // SUBSCRIPTION DELETED - Canceled or payment failed
      // ============================================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find the user and downgrade to free
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub?.user_id) {
          await supabase
            .from("subscriptions")
            .update({
              plan_id: "free",
              status: "active", // They're now active on the Free plan
              stripe_subscription_id: null, // Clear the stale subscription ID
              current_period_end: null, // No billing period on Free
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", existingSub.user_id);

          console.log(`✅ Subscription ended for user ${existingSub.user_id}, downgraded to Free plan`);
        }
        break;
      }

      // ============================================================
      // INVOICE PAYMENT FAILED - Payment issue
      // ============================================================
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub?.user_id) {
          await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", existingSub.user_id);

          console.log(`⚠️ Payment failed for user ${existingSub.user_id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
