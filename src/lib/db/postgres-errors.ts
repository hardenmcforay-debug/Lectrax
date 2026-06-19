/** Postgres error helpers for race-safe API handling. */

type PostgresLikeError = {
  code?: string;
  message?: string;
};

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as PostgresLikeError).code === "23505"
  );
}

export function getPostgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as PostgresLikeError).code;
  return typeof code === "string" ? code : undefined;
}
