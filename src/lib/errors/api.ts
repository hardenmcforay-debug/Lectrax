import { NextResponse } from "next/server";
import {
  classifyApiResponse,
  isDefinitiveAuthError,
  isTransientError,
  sanitizeErrorMessage,
} from "@/lib/errors/classify";
import { logPlatformError } from "@/lib/errors/logger";
import type { PlatformErrorCode } from "@/lib/errors/types";

export function apiErrorResponse(
  message: string,
  status: number,
  code?: PlatformErrorCode
): NextResponse {
  return NextResponse.json(
    {
      error: sanitizeErrorMessage(message),
      code,
    },
    { status }
  );
}

export function apiUnauthorizedResponse(): NextResponse {
  return apiErrorResponse("Not authenticated", 401, "AUTH_SESSION_MISSING");
}

export function apiServiceUnavailableResponse(): NextResponse {
  return apiErrorResponse(
    "Service temporarily unavailable. Please try again.",
    503,
    "SERVICE_UNAVAILABLE"
  );
}

export function apiDatabaseErrorResponse(
  message = "Could not complete the request"
): NextResponse {
  return apiErrorResponse(message, 400);
}

export function apiPaymentUnavailableResponse(): NextResponse {
  return apiErrorResponse(
    "Payment service is currently unavailable. Please try again later.",
    503,
    "PAYMENT_UNAVAILABLE"
  );
}

export function handleApiRouteError(scope: string, error: unknown): NextResponse {
  logPlatformError(scope, error);

  if (isDefinitiveAuthError(error)) {
    return apiUnauthorizedResponse();
  }

  if (isTransientError(error)) {
    return apiServiceUnavailableResponse();
  }

  const platformError = classifyApiResponse(500);
  return NextResponse.json(
    {
      error: platformError.userMessage,
      code: platformError.code,
    },
    { status: 500 }
  );
}
