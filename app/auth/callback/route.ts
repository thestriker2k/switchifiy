import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  
  // Get plan params (passed through from login page)
  const plan = requestUrl.searchParams.get("plan");
  const billing = requestUrl.searchParams.get("billing") || "yearly";

  // If there's an OAuth error, redirect to login with error message
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription || error)}`,
        request.url,
      ),
    );
  }

  if (code) {
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

    const { error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error("Session exchange error:", sessionError);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(sessionError.message)}`,
          request.url,
        ),
      );
    }

    // If user selected a paid plan, redirect to checkout
    if (plan && plan !== "free") {
      const checkoutParams = new URLSearchParams();
      checkoutParams.set("plan", plan);
      checkoutParams.set("billing", billing);
      
      return NextResponse.redirect(
        new URL(`/api/stripe/checkout-redirect?${checkoutParams.toString()}`, request.url)
      );
    }
  }

  // Default: redirect to dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
