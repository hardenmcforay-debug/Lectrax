import { NextResponse } from "next/server";

/**
 * Public bounce endpoint for Monime (and similar) payment returns.
 *
 * Payment gateways may redirect via cross-site GET or POST. Auth cookies with
 * SameSite=Lax are not sent on cross-site POSTs, so hitting a protected page
 * directly would look like an unauthenticated request and force /login.
 *
 * This route is public: it only validates the outcome and issues a same-origin
 * 303 GET to the destination page, where cookies are present again.
 */
function resolveOutcome(request: Request): "success" | "cancelled" {
  const { searchParams } = new URL(request.url);
  const outcome = (searchParams.get("outcome") ?? searchParams.get("status") ?? "").toLowerCase();

  if (outcome === "success" || outcome === "complete" || outcome === "completed") {
    return "success";
  }

  return "cancelled";
}

function bounceAfterPayment(request: Request, outcome: "success" | "cancelled") {
  const { searchParams } = new URL(request.url);
  const flow = (searchParams.get("flow") ?? "").toLowerCase();
  const paymentId = searchParams.get("paymentId") ?? searchParams.get("payment_id");

  if (flow === "partnership") {
    const url = new URL("/partnerships", request.url);
    if (outcome === "success") {
      url.searchParams.set("payment", "success");
    } else {
      url.searchParams.set("payment", "cancelled");
    }
    if (paymentId) {
      url.searchParams.set("ref", paymentId);
    }
    url.hash = "partnership-payment";
    return NextResponse.redirect(url, 303);
  }

  const url = new URL("/lecturer/subscription", request.url);
  if (outcome === "success") {
    url.searchParams.set("success", "1");
  } else {
    url.searchParams.set("cancelled", "1");
  }
  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  return bounceAfterPayment(request, resolveOutcome(request));
}

export async function POST(request: Request) {
  return bounceAfterPayment(request, resolveOutcome(request));
}
