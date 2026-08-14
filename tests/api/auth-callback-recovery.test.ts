import { describe, expect, it } from "vitest";

describe("GET /auth/callback recovery", () => {
  it("forwards recovery codes to /reset-password without exchanging", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      new Request(
        "http://localhost/auth/callback?code=abc123&type=recovery&next=/reset-password"
      )
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/reset-password");
    expect(location).toContain("code=abc123");
    expect(location).toContain("type=recovery");
    expect(location).not.toContain("/login");
  });

  it("sends hash-only callback visits to /reset-password instead of sign-in", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new Request("http://localhost/auth/callback"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/reset-password");
    expect(location).not.toContain("/login");
  });
});
