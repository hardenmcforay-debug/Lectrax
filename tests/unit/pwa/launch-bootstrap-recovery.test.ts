import { describe, expect, it } from "vitest";
import { PWA_LAUNCH_BOOTSTRAP_SCRIPT } from "@/lib/pwa/launch-bootstrap";

describe("PWA launch bootstrap recovery", () => {
  it("does not send password-reset links to /go/login", () => {
    expect(PWA_LAUNCH_BOOTSTRAP_SCRIPT).toContain("function recovery(");
    expect(PWA_LAUNCH_BOOTSTRAP_SCRIPT).toContain("/reset-password");
    expect(PWA_LAUNCH_BOOTSTRAP_SCRIPT).toContain("/auth/callback");
    expect(PWA_LAUNCH_BOOTSTRAP_SCRIPT).toContain("type=recovery");
    expect(PWA_LAUNCH_BOOTSTRAP_SCRIPT).toContain(
      "if(recovery(path,search,hash)){clearShell();openMarketingInBrowser(w.location.href);return;}"
    );
  });
});
