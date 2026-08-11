import http from "k6/http";
import { baseUrl, allowRateLimits } from "./env.js";
import { observe } from "./metrics.js";

export const CSRF_HEADER = { "X-Lectrax-Request": "1" };

export function jsonHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...CSRF_HEADER,
    ...extra,
  };
}

export function url(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl()}${p}`;
}

/**
 * Merge Set-Cookie jar into a Cookie header string for subsequent requests.
 * k6 http.cookieJar() is preferred when available; this helps with tagged calls.
 */
export function cookieHeaderFromJar(jar, requestUrl) {
  try {
    const cookies = jar.cookiesForURL(requestUrl);
    return Object.entries(cookies)
      .map(([name, values]) => `${name}=${values[0]}`)
      .join("; ");
  } catch {
    return "";
  }
}

/**
 * Standard Lectrax API call with CSRF + optional cookie jar.
 */
export function apiRequest(method, path, body, params = {}) {
  const fullUrl = url(path);
  const payload =
    body === null || body === undefined
      ? null
      : typeof body === "string"
        ? body
        : JSON.stringify(body);

  const headers = {
    ...jsonHeaders(params.headers || {}),
  };

  const res = http.request(method, fullUrl, payload, {
    tags: { endpoint: path, ...(params.tags || {}) },
    timeout: params.timeout || "60s",
    redirects: params.redirects ?? 0,
    cookies: params.cookies,
    jar: params.jar,
    headers,
  });

  observe(res, params.trend || null, { allow429: allowRateLimits() });
  return res;
}

export function apiGet(path, params = {}) {
  return apiRequest("GET", path, null, params);
}

export function apiPost(path, body, params = {}) {
  return apiRequest("POST", path, body, params);
}

export function apiPut(path, body, params = {}) {
  return apiRequest("PUT", path, body, params);
}

export function apiDelete(path, body, params = {}) {
  return apiRequest("DELETE", path, body, params);
}
