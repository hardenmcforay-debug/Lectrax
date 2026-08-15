import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://lectrax.com";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  clear: () => void;
};

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    clear: () => {
      map.clear();
    },
  };
}

function installBrowserGlobals(options: {
  standalone: boolean;
  pathname: string;
}) {
  const storage = createMemoryStorage();
  const location = {
    pathname: options.pathname,
    origin: ORIGIN,
    href: `${ORIGIN}${options.pathname}`,
    search: "",
    hash: "",
  };

  vi.stubGlobal("window", {
    localStorage: storage,
    location,
    matchMedia: (query: string) => ({
      matches: options.standalone && query.includes("display-mode: standalone"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
    navigator: {},
  });
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("localStorage", storage);
}

describe("toClientAppPath — PWA assignment navigation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("keeps Create Assignment on /go when the lecturer PWA is open", async () => {
    installBrowserGlobals({
      standalone: true,
      pathname: "/go/lecturer/sessions/session-1",
    });
    const { toClientAppPath } = await import("@/lib/pwa/config");

    expect(toClientAppPath("/lecturer/sessions/session-1/assignments")).toBe(
      "/go/lecturer/sessions/session-1/assignments"
    );
    expect(
      toClientAppPath("/lecturer/sessions/session-1?tab=assignments")
    ).toBe("/go/lecturer/sessions/session-1?tab=assignments");
    expect(
      toClientAppPath("/lecturer/sessions/session-1/tests/test-1")
    ).toBe("/go/lecturer/sessions/session-1/tests/test-1");
  });

  it("keeps Create Assignment on /go when already under the PWA scope", async () => {
    installBrowserGlobals({
      standalone: false,
      pathname: "/go/lecturer/sessions/session-1",
    });
    const { toClientAppPath } = await import("@/lib/pwa/config");

    expect(toClientAppPath("/lecturer/sessions/session-1/assignments")).toBe(
      "/go/lecturer/sessions/session-1/assignments"
    );
  });

  it("does not prefix portal paths in a normal browser tab", async () => {
    installBrowserGlobals({
      standalone: false,
      pathname: "/lecturer/sessions/session-1",
    });
    const { toClientAppPath } = await import("@/lib/pwa/config");

    expect(toClientAppPath("/lecturer/sessions/session-1/assignments")).toBe(
      "/lecturer/sessions/session-1/assignments"
    );
  });
});

describe("rewriteUnscopedAppShellHref", () => {
  it("rewrites Create Assignment onto /go so PWA cookies are used", async () => {
    const { rewriteUnscopedAppShellHref } = await import("@/lib/pwa/scope");

    expect(
      rewriteUnscopedAppShellHref(
        "/lecturer/sessions/session-1/assignments",
        ORIGIN
      )
    ).toBe("/go/lecturer/sessions/session-1/assignments");
    expect(
      rewriteUnscopedAppShellHref(
        `${ORIGIN}/lecturer/sessions/session-1/assignments?tab=assignments`,
        ORIGIN
      )
    ).toBe(`${ORIGIN}/go/lecturer/sessions/session-1/assignments?tab=assignments`);
    expect(
      rewriteUnscopedAppShellHref(
        "/lecturer/sessions/session-1/tests/test-1",
        ORIGIN
      )
    ).toBe("/go/lecturer/sessions/session-1/tests/test-1");
  });

  it("does not rewrite scoped, marketing, or recovery URLs", async () => {
    const { rewriteUnscopedAppShellHref } = await import("@/lib/pwa/scope");

    expect(
      rewriteUnscopedAppShellHref("/go/lecturer/sessions/session-1", ORIGIN)
    ).toBeNull();
    expect(rewriteUnscopedAppShellHref("/about", ORIGIN)).toBeNull();
    expect(rewriteUnscopedAppShellHref("/reset-password", ORIGIN)).toBeNull();
    expect(rewriteUnscopedAppShellHref("/auth/callback", ORIGIN)).toBeNull();
    expect(
      rewriteUnscopedAppShellHref("https://other.example/lecturer", ORIGIN)
    ).toBeNull();
  });
});

const SRC_ROOT = join(process.cwd(), "src");
const ALLOW_UNSCOPED_ROUTER_NAV = new Set([
  // Recovery must stay on the site cookie jar after a password update.
  "app/(auth)/reset-password/page.tsx",
]);

const UNSCOPED_ROUTER_NAV =
  /router\.(push|replace)\((?:(?!toClientAppPath|toPwaScopePath)[^)])*[`'"]\/(lecturer|student|admin|login|signup|forgot-password)\b/;

function walkTsFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsFiles(full, files);
      continue;
    }
    if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("PWA client navigation guard", () => {
  it("does not router.push unscoped portal paths (would log the PWA out)", () => {
    const violations: string[] = [];

    for (const file of walkTsFiles(SRC_ROOT)) {
      const rel = relative(SRC_ROOT, file).replaceAll("\\", "/");
      if (ALLOW_UNSCOPED_ROUTER_NAV.has(rel)) continue;

      const source = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      if (UNSCOPED_ROUTER_NAV.test(source)) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });

  it("Create Assignment navigates through toClientAppPath", () => {
    const sessionPage = readFileSync(
      join(SRC_ROOT, "components/lecturer/session-page-client.tsx"),
      "utf8"
    );
    const createForm = readFileSync(
      join(
        SRC_ROOT,
        "app/lecturer/sessions/[id]/assignments/create-assignment-form.tsx"
      ),
      "utf8"
    );

    expect(sessionPage).toContain(
      "router.push(toClientAppPath(`/lecturer/sessions/${session.id}/assignments`))"
    );
    expect(sessionPage).not.toContain(
      "router.push(`/lecturer/sessions/${session.id}/assignments`)"
    );
    expect(createForm).toContain(
      "router.push(toClientAppPath(`/lecturer/sessions/${sessionId}?tab=assignments`))"
    );
  });

  it("Create Test hard-navigates through toClientAppPath", () => {
    const caPanel = readFileSync(
      join(SRC_ROOT, "components/lecturer/ca-structure-panel.tsx"),
      "utf8"
    );

    expect(caPanel).toContain(
      "toClientAppPath(`/lecturer/sessions/${session.id}/tests/${data.test.id}`)"
    );
    expect(caPanel).toContain("window.location.assign(");
    expect(caPanel).not.toMatch(
      /router\.push\(\s*(?:toClientAppPath\()?`\/lecturer\/sessions\/\$\{session\.id\}\/tests/
    );
  });

  it("rewrites unscoped PWA fetches so router.push cannot hit site cookies", () => {
    const navigatorSource = readFileSync(
      join(SRC_ROOT, "components/pwa/pwa-scope-navigator.tsx"),
      "utf8"
    );
    expect(navigatorSource).toContain("rewriteUnscopedAppShellHref");
    expect(navigatorSource).toContain("window.fetch = lectraxPwaScopedFetch");
  });
});
