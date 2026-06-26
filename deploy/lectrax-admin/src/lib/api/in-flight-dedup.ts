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
    return existing.then((response) => response.clone());
  }

  const promise = execute();
  inFlightGetRequests.set(key, promise);

  promise.finally(() => {
    inFlightGetRequests.delete(key);
  });

  return promise.then((response) => response.clone());
}
