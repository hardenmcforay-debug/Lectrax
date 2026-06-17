export type AuthErrorContext = "login" | "signup" | "password-reset" | "session";

export type AuthUserMessage = {
  title: string;
  description: string;
  retryable: boolean;
};

export const AUTH_OFFLINE_MESSAGE: AuthUserMessage = {
  title: "You're Offline",
  description: "Please reconnect to the internet and try again.",
  retryable: true,
};

export const AUTH_SERVICE_UNAVAILABLE_MESSAGE: AuthUserMessage = {
  title: "Service Temporarily Unavailable",
  description:
    "We're currently experiencing technical difficulties. Please try again in a few moments.",
  retryable: true,
};

const AUTH_NETWORK_BY_CONTEXT: Record<AuthErrorContext, AuthUserMessage> = {
  login: {
    title: "Connection Error",
    description:
      "We couldn't connect to our servers. Please check your internet connection and try again.",
    retryable: true,
  },
  signup: {
    title: "Connection Error",
    description:
      "We couldn't complete your request due to a network issue. Please check your connection and try again.",
    retryable: true,
  },
  "password-reset": {
    title: "Connection Error",
    description:
      "Unable to send the password reset request. Please check your internet connection and try again.",
    retryable: true,
  },
  session: {
    title: "Connection Error",
    description:
      "We're having trouble connecting to our services. Some features may be temporarily unavailable.",
    retryable: true,
  },
};

export function getAuthNetworkMessage(context: AuthErrorContext): AuthUserMessage {
  return AUTH_NETWORK_BY_CONTEXT[context];
}
