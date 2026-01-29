import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Get the user's subscription from database
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      console.error("Error fetching subscription:", subError);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 },
      );
    }

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 },
      );
    }

    // Cancel the subscription at period end (not immediately)
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      },
    );

    // Update the subscription status in database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        status: "active", // Still active until period ends
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      // Don't return error - Stripe cancellation succeeded
    }

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
      cancelAt: canceledSubscription.cancel_at,
      currentPeriodEnd: canceledSubscription.current_period_end,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel subscription",
      },
      { status: 500 },
    );
  }
}
