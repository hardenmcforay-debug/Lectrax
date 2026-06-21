const inFlightGetRequests = new Map<string, Promise<Response>>();

export function buildInFlightRequestKey(method: string, url: string): string {
  return `${method.toUpperCase()}:${url}`;
}

/** Coalesce identical in-flight GET requests to reduce duplicate API traffic. */
export function dedupeInFlightGetRequest(
  key: string,
  execute: () => Promise<Response>
): Promise<Response> {
  const existing = inFlightGetRequests.get(key);
  if (existing) {
    return existing;
  }

  const promise = execute().finally(() => {
    inFlightGetRequests.delete(key);
  });

  inFlightGetRequests.set(key, promise);
  return promise;
}
