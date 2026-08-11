import { check } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";
import { apiGet, apiPost, url, jsonHeaders } from "./http.js";
import { metrics, observe } from "./metrics.js";
import { allowRateLimits, env } from "./env.js";

/**
 * Load test users from JSON (path relative to the entry scenario script dir).
 * Format: [{ "identifier": "...", "password": "...", "role": "student"|"lecturer" }]
 */
export const users = new SharedArray("lectrax-users", () => {
  const configured = env("USERS_FILE", "");
  const candidates = [
    configured,
    configured ? `../${configured}` : "",
    "../data/users.json",
    "data/users.json",
    "../data/users.example.json",
  ].filter(Boolean);

  for (const path of candidates) {
    try {
      const raw = open(path);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      /* try next */
    }
  }

  // Fallback synthetic users — only useful against seeded staging.
  const count = Number(env("SYNTHETIC_USER_COUNT", "100"));
  const domain = env("SYNTHETIC_EMAIL_DOMAIN", "loadtest.lectrax.local");
  const password = env("SYNTHETIC_PASSWORD", "LoadTest!pass1");
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      identifier: `student${i}@${domain}`,
      password,
      role: "student",
      vuHint: i,
    });
  }
  const lecturer = env("LECTURER_IDENTIFIER");
  const lecturerPassword = env("LECTURER_PASSWORD", password);
  if (lecturer) {
    list.unshift({
      identifier: lecturer,
      password: lecturerPassword,
      role: "lecturer",
      vuHint: 0,
    });
  }
  if (list.length === 0) {
    throw new Error("Unable to load users. Provide data/users.json or SYNTHETIC_* / LECTURER_* env.");
  }
  return list;
});

export function pickUser(vu = __VU) {
  const idx = (vu - 1) % users.length;
  return users[idx];
}

export function pickLecturer() {
  const lecturer = users.find((u) => u.role === "lecturer");
  if (lecturer) return lecturer;
  const identifier = env("LECTURER_IDENTIFIER");
  if (!identifier) {
    throw new Error("No lecturer user in USERS_FILE and LECTURER_IDENTIFIER unset");
  }
  return {
    identifier,
    password: env("LECTURER_PASSWORD", "LoadTest!pass1"),
    role: "lecturer",
  };
}

/**
 * Login via Lectrax API and return cookie jar + role probe.
 */
export function login(identifier, password) {
  const jar = http.cookieJar();
  const loginUrl = url("/api/auth/login");
  const res = http.post(
    loginUrl,
    JSON.stringify({ identifier, password }),
    {
      headers: jsonHeaders(),
      jar,
      tags: { endpoint: "/api/auth/login", flow: "auth" },
      timeout: "30s",
    }
  );

  observe(res, metrics.authLatency, { allow429: allowRateLimits() });

  const ok = check(res, {
    "login status 200": (r) => r.status === 200,
    "login sets cookies": () => {
      const cookies = jar.cookiesForURL(loginUrl);
      return Object.keys(cookies).some((name) => /auth-token|sb-/i.test(name));
    },
  });

  if (!ok && res.status !== 429) {
    metrics.integrityErrors.add(1);
  }

  let role = null;
  if (res.status === 200) {
    const roleRes = apiGet("/api/auth/role", {
      jar,
      tags: { flow: "auth" },
      trend: metrics.authLatency,
    });
    try {
      role = roleRes.json("role");
    } catch {
      role = null;
    }
  }

  return { jar, res, role, ok: res.status === 200 };
}

export function loginAs(user) {
  return login(user.identifier, user.password);
}
