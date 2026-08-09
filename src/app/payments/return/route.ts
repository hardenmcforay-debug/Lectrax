import { NextResponse } from "next/server";
import { LECTRAX_PAYMENT_RETURN_MESSAGE } from "@/lib/payments/hosted-checkout-bridge";

/**
 * Public bounce endpoint for Monime (and similar) payment returns.
 *
 * Payment gateways may redirect via cross-site GET or POST. Auth cookies with
 * SameSite=Lax are not sent on cross-site POSTs, so hitting a protected page
 * directly would look like an unauthenticated request and force /login.
 *
 * GET returns a tiny HTML bridge so in-app checkout iframes can postMessage
 * the parent Lectrax window instead of navigating the whole app away.
 * Top-level browsers still replace to the destination page.
 */
function resolveOutcome(request: Request): "success" | "cancelled" {
  const { searchParams } = new URL(request.url);
  const outcome = (searchParams.get("outcome") ?? searchParams.get("status") ?? "").toLowerCase();

  if (outcome === "success" || outcome === "complete" || outcome === "completed") {
    return "success";
  }

  return "cancelled";
}

function resolveDestination(request: Request, outcome: "success" | "cancelled"): string {
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
    return `${url.pathname}${url.search}${url.hash}`;
  }

  const url = new URL("/lecturer/subscription", request.url);
  if (outcome === "success") {
    url.searchParams.set("success", "1");
  } else {
    url.searchParams.set("cancelled", "1");
  }
  return `${url.pathname}${url.search}`;
}

function htmlBridge(outcome: "success" | "cancelled", dest: string): NextResponse {
  const payload = JSON.stringify({
    source: LECTRAX_PAYMENT_RETURN_MESSAGE,
    outcome,
    dest,
  });

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to Lectrax</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; display: grid; min-height: 100vh; place-items: center; color: #0f172a; background: #f8fafc; }
      p { margin: 0; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <p>Returning to Lectrax…</p>
    <script>
      (function () {
        var message = ${payload};
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, window.location.origin);
            return;
          }
        } catch (e) {}
        window.location.replace(message.dest);
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const outcome = resolveOutcome(request);
  return htmlBridge(outcome, resolveDestination(request, outcome));
}

export async function POST(request: Request) {
  const outcome = resolveOutcome(request);
  return htmlBridge(outcome, resolveDestination(request, outcome));
}
