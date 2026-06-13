import type { ErrorCategory, PlatformErrorCode } from "@/lib/errors/types";

export const ERROR_MESSAGES: Record<
  ErrorCategory,
  { title: string; description: string }
> = {
  auth: {
    title: "Authentication Required",
    description: "Please sign in to continue.",
  },
  network: {
    title: "Connection Lost",
    description: "Please check your internet connection and try again.",
  },
  supabase: {
    title: "Service Temporarily Unavailable",
    description:
      "We're unable to connect to our services right now. Please try again in a few moments.",
  },
  payment: {
    title: "Payment Service Unavailable",
    description: "The payment provider is currently unavailable. Please try again later.",
  },
  data: {
    title: "Unable to Load Data",
    description: "Please try again.",
  },
  form: {
    title: "Action Failed",
    description: "Your request could not be completed. Please try again.",
  },
  unknown: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please refresh the page or try again later.",
  },
};

export const OFFLINE_MODE_MESSAGE = "You're currently offline.";
export const OFFLINE_MODE_SUBMESSAGE =
  "Some features may be unavailable until your connection is restored.";

export function getMessageForCode(code: PlatformErrorCode): {
  title: string;
  description: string;
} {
  switch (code) {
    case "AUTH_INVALID":
    case "AUTH_SESSION_MISSING":
      return ERROR_MESSAGES.auth;
    case "NETWORK_OFFLINE":
    case "NETWORK_TIMEOUT":
    case "NETWORK_FAILURE":
      return ERROR_MESSAGES.network;
    case "SERVICE_UNAVAILABLE":
    case "SUPABASE_UNAVAILABLE":
      return ERROR_MESSAGES.supabase;
    case "PAYMENT_UNAVAILABLE":
      return ERROR_MESSAGES.payment;
    case "DATA_FETCH_FAILED":
      return ERROR_MESSAGES.data;
    case "FORM_SUBMISSION_FAILED":
      return ERROR_MESSAGES.form;
    default:
      return ERROR_MESSAGES.unknown;
  }
}
