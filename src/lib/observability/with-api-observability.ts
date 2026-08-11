/**
 * Shared API route observer — metrics/logs/traces for every critical endpoint.
 *
 * Captures requestId, userId, route, method, status, duration, tenant, device, IP, UA.
 * Classifies success, validation, authorization, rate-limit, and server failures.
 */

import { NextResponse } from "next/server";
import { buildRequestContext } from "@/lib/observability/context";
import {
  BUSINESS_EVENTS,
  REQUEST_ID_RESPONSE_HEADER,
  classifyApiOutcome,
} from "@/lib/observability/constants";
import type { ApiRequestOutcome } from "@/lib/observability/constants";
import { resolveRequestId } from "@/lib/observability/request-id";
import {
  getObservabilityIdentity,
  peekUserIdFromCookieHeader,
  runWithObservabilityStore,
} from "@/lib/observability/request-store";
import { logApiAccess } from "@/lib/observability/structured-log";
import { trackBusinessEvent } from "@/lib/observability/business-events";
import {
  addBreadcrumb,
  setSentryUser,
  startServerSpan,
} from "@/lib/observability/sentry";

// Loose handler typing so route-specific `params` shapes remain assignable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRouteHandler = (...args: any[]) => Promise<Response> | Response;

function outcomeBreadcrumbLevel(
  outcome: ApiRequestOutcome
): "info" | "warning" | "error" {
  if (outcome === "server_error") return "error";
  if (outcome === "success") return "info";
  return "warning";
}

export function withApiObservability(
  scope: string,
  handler: AnyRouteHandler
): AnyRouteHandler {
  return async (request: Request, context?: unknown) => {
    const started = Date.now();
    const requestId = resolveRequestId(request);
    const tenantHint =
      request.headers.get("x-lectrax-tenant")?.trim() || null;
    const peekedUserId = peekUserIdFromCookieHeader(
      request.headers.get("cookie")
    );

    return runWithObservabilityStore(
      { userId: peekedUserId, tenant: tenantHint },
      () =>
        startServerSpan(
          {
            name: `api.${scope}`,
            op: "http.server",
            attributes: {
              "http.method": request.method,
              "http.route": new URL(request.url).pathname,
              "lectrax.scope": scope,
              "lectrax.request_id": requestId,
            },
          },
          async () => {
            const base = buildRequestContext(request, { requestId });

            addBreadcrumb({
              category: "http",
              message: `${request.method} ${base.route}`,
              level: "info",
              data: {
                scope,
                requestId,
                method: base.method,
                route: base.route,
                tenant: base.tenant,
                device: base.device,
                ip: base.ip,
              },
            });

            try {
              const response = await handler(request, context);
              const durationMs = Date.now() - started;
              const statusCode = response.status;
              const outcome = classifyApiOutcome(statusCode);
              const identity = getObservabilityIdentity();
              const userId = identity.userId ?? peekedUserId;
              const tenant = identity.tenant ?? tenantHint;

              if (userId) setSentryUser({ id: userId });

              const headers = new Headers(response.headers);
              headers.set(REQUEST_ID_RESPONSE_HEADER, requestId);
              const observed = new NextResponse(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers,
              });

              const accessFields = {
                ...base,
                scope,
                userId,
                tenant,
                status: statusCode,
                statusCode,
                duration: durationMs,
                durationMs,
                outcome,
              };

              logApiAccess(accessFields);

              addBreadcrumb({
                category: "http",
                message: `${request.method} ${base.route} → ${statusCode}`,
                level: outcomeBreadcrumbLevel(outcome),
                data: {
                  scope,
                  requestId,
                  status: statusCode,
                  durationMs,
                  outcome,
                  userId,
                  tenant,
                },
              });

              // 4xx outcomes stay on access logs + breadcrumbs; 5xx raise ops alerts.
              if (outcome === "server_error") {
                trackBusinessEvent(
                  BUSINESS_EVENTS.API_ERROR,
                  {
                    scope,
                    statusCode,
                    route: base.route,
                    method: base.method,
                    requestId,
                    durationMs,
                    userId,
                    tenant,
                  },
                  { userId, severity: "error" }
                );
              }

              return observed;
            } catch (error) {
              const durationMs = Date.now() - started;
              const identity = getObservabilityIdentity();
              const userId = identity.userId ?? peekedUserId;
              const tenant = identity.tenant ?? tenantHint;

              logApiAccess({
                ...base,
                scope,
                userId,
                tenant,
                status: 500,
                statusCode: 500,
                duration: durationMs,
                durationMs,
                outcome: "server_error",
                error: error instanceof Error ? error.message : "unhandled",
              });

              addBreadcrumb({
                category: "http",
                message: `${request.method} ${base.route} → unhandled`,
                level: "error",
                data: {
                  scope,
                  requestId,
                  durationMs,
                  userId,
                  tenant,
                  error: error instanceof Error ? error.message : "unhandled",
                },
              });

              trackBusinessEvent(
                BUSINESS_EVENTS.API_ERROR,
                {
                  scope,
                  route: base.route,
                  method: base.method,
                  requestId,
                  durationMs,
                  userId,
                  tenant,
                },
                { userId, severity: "error" }
              );

              throw error;
            }
          }
        )
    );
  };
}
