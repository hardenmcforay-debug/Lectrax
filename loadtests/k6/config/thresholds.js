/**
 * Lectrax performance SLOs for k6 thresholds.
 * Tune via THRESHOLD_PROFILE=strict|standard|soak
 */
import { env } from "../lib/env.js";

const PROFILES = {
  /** Early staging / smoke */
  smoke: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    lectrax_http_error_rate: ["rate<0.05"],
    lectrax_timeout_rate: ["rate<0.01"],
    checks: ["rate>0.95"],
  },
  /** Default production-candidate validation */
  standard: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<800", "p(99)<2000"],
    lectrax_auth_latency: ["p(95)<1000"],
    lectrax_attendance_scan_latency: ["p(95)<600", "p(99)<1500"],
    lectrax_dashboard_latency: ["p(95)<1200"],
    lectrax_assignment_submit_latency: ["p(95)<3000"],
    lectrax_grade_publish_latency: ["p(95)<2500"],
    lectrax_payment_latency: ["p(95)<2000"],
    lectrax_upload_latency: ["p(95)<3000"],
    lectrax_analytics_latency: ["p(95)<1500"],
    lectrax_http_error_rate: ["rate<0.02"],
    lectrax_timeout_rate: ["rate<0.005"],
    checks: ["rate>0.98"],
  },
  /** Stricter for smaller scales (≤1k) */
  strict: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1200"],
    lectrax_attendance_scan_latency: ["p(95)<400", "p(99)<900"],
    lectrax_http_error_rate: ["rate<0.01"],
    lectrax_timeout_rate: ["rate<0.002"],
    checks: ["rate>0.99"],
  },
  /** Long soak — allow more rate-limit noise if ALLOW_RATE_LIMITS */
  soak: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500", "p(99)<4000"],
    lectrax_http_error_rate: ["rate<0.05"],
    lectrax_timeout_rate: ["rate<0.01"],
    checks: ["rate>0.95"],
  },
};

export function thresholds() {
  const name = env("THRESHOLD_PROFILE", "standard");
  return PROFILES[name] || PROFILES.standard;
}

export function withThresholds(options) {
  return {
    ...options,
    thresholds: {
      ...thresholds(),
      ...(options.thresholds || {}),
    },
  };
}
