/** Columns commonly needed across the app — avoids select("*") on profiles. */
export const PROFILE_COLUMNS =
  "id, email, full_name, role, college_id, avatar_url, phone, is_active, subscription_plan, subscription_status, subscription_start_date, subscription_end_date, grace_period_end_date, created_at, updated_at" as const;
