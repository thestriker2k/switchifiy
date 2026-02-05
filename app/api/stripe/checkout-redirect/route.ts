// /app/api/stripe/checkout-redirect/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { stripe, STRIPE_PRICES } from "@/lib/stripe/server";

// Create Supabase admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plan = searchParams.get("plan");
    const billing = searchParams.get("billing") || "yearly";
    const isYearly = billing === "yearly";

    // Validate plan
    if (!plan || (plan !== "starter" && plan !== "pro")) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=invalid_plan", request.url)
      );
    }

    // Get the current user from the session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.redirect(
        new URL("/login?error=auth_required", request.url)
      );
    }

    const userId = user.id;
    const userEmail = user.email;

    if (!userEmail) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=email_required", request.url)
      );
    }

    // Get the correct price ID
    const priceId = isYearly
      ? STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES].yearly
      : STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES].monthly;

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    // Create a new Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = customer.id;

      // Save the customer ID to the database (upsert in case subscription row doesn't exist)
      const { error: upsertError } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          { 
            user_id: userId, 
            stripe_customer_id: customerId,
            plan_id: "free", // Default until checkout completes
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Error saving customer ID:", upsertError);
      }
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?welcome=true&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?canceled=true`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan_id: plan,
        },
      },
      metadata: {
        supabase_user_id: userId,
        plan_id: plan,
      },
    });

    // Redirect to Stripe Checkout
    if (session.url) {
      return NextResponse.redirect(session.url);
    }

    // Fallback if no URL (shouldn't happen)
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=checkout_failed", request.url)
    );

  } catch (error) {
    console.error("Checkout redirect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=checkout_failed", request.url)
    );
  }
}
