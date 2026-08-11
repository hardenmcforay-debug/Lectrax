import { Trend, Rate, Counter } from "k6/metrics";

/** Custom business/system metrics for Lectrax load reports. */
export const metrics = {
  authLatency: new Trend("lectrax_auth_latency", true),
  attendanceScanLatency: new Trend("lectrax_attendance_scan_latency", true),
  attendanceRefreshLatency: new Trend("lectrax_attendance_refresh_latency", true),
  dashboardLatency: new Trend("lectrax_dashboard_latency", true),
  assignmentSubmitLatency: new Trend("lectrax_assignment_submit_latency", true),
  gradePublishLatency: new Trend("lectrax_grade_publish_latency", true),
  paymentLatency: new Trend("lectrax_payment_latency", true),
  uploadLatency: new Trend("lectrax_upload_latency", true),
  analyticsLatency: new Trend("lectrax_analytics_latency", true),

  httpErrors: new Rate("lectrax_http_error_rate"),
  timeouts: new Rate("lectrax_timeout_rate"),
  rateLimited: new Counter("lectrax_rate_limited_total"),
  integrityErrors: new Counter("lectrax_integrity_errors_total"),
};

/**
 * Record a response against Lectrax custom metrics.
 * @param {import("k6/http").RefinedResponse} res
 * @param {import("k6/metrics").Trend | null} trend
 * @param {{ allow429?: boolean }} [opts]
 */
export function observe(res, trend, opts = {}) {
  const allow429 = opts.allow429 !== false;
  const timedOut = res.timings.duration === 0 && res.status === 0;
  metrics.timeouts.add(timedOut ? 1 : 0);

  if (res.status === 429) {
    metrics.rateLimited.add(1);
  }

  const isError =
    timedOut ||
    res.status === 0 ||
    res.status >= 500 ||
    (res.status >= 400 && !(allow429 && res.status === 429));

  metrics.httpErrors.add(isError ? 1 : 0);

  if (trend) {
    trend.add(res.timings.duration);
  }

  return !isError;
}
