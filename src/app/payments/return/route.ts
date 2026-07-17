import { NextResponse } from "next/server";

/**
 * Public bounce endpoint for Monime (and similar) payment returns.
 *
 * Payment gateways may redirect via cross-site GET or POST. Auth cookies with
 * SameSite=Lax are not sent on cross-site POSTs, so hitting a protected page
 * directly would look like an unauthenticated request and force /login.
 *
 * This route is public: it only validates the outcome and issues a same-origin
 * 303 GET to the subscription page, where cookies are present again.
 */
function resolveOutcome(request: Request): "success" | "cancelled" {
  const { searchParams } = new URL(request.url);
  const outcome = (searchParams.get("outcome") ?? searchParams.get("status") ?? "").toLowerCase();

  if (outcome === "success" || outcome === "complete" || outcome === "completed") {
    return "success";
  }

  return "cancelled";
}

function bounceToSubscription(request: Request, outcome: "success" | "cancelled") {
  const url = new URL("/lecturer/subscription", request.url);
  if (outcome === "success") {
    url.searchParams.set("success", "1");
  } else {
    url.searchParams.set("cancelled", "1");
  }
  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  return bounceToSubscription(request, resolveOutcome(request));
}

export async function POST(request: Request) {
  return bounceToSubscription(request, resolveOutcome(request));
}
