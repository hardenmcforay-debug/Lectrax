import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function installBrowserGlobals(matchesStandalone: boolean) {
  const storage = createMemoryStorage();

  vi.stubGlobal("window", {
    localStorage: storage,
    matchMedia: (query: string) => ({
      matches:
        matchesStandalone &&
        (query.includes("display-mode: standalone") ||
          query.includes("display-mode: fullscreen") ||
          query.includes("display-mode: minimal-ui")),
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

  return storage;
}

describe("PWA display-mode detection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("does not treat a prior install flag as an active standalone launch", async () => {
    const storage = installBrowserGlobals(false);
    const {
      isRunningAsInstalledPwa,
      markPwaInstalled,
      PWA_INSTALLED_STORAGE_KEY,
      wasPwaInstalled,
    } = await import("@/lib/pwa/detect");

    markPwaInstalled();

    expect(wasPwaInstalled()).toBe(true);
    expect(storage.getItem(PWA_INSTALLED_STORAGE_KEY)).toBe("1");
    // Routing must use this — not wasPwaInstalled / isStandaloneMode.
    expect(isRunningAsInstalledPwa()).toBe(false);
  });

  it("detects an active installed display mode without relying on localStorage", async () => {
    const storage = installBrowserGlobals(true);
    const { isRunningAsInstalledPwa, wasPwaInstalled } = await import(
      "@/lib/pwa/detect"
    );

    expect(wasPwaInstalled()).toBe(false);
    expect(storage.getItem("lectrax-pwa-installed")).toBeNull();
    expect(isRunningAsInstalledPwa()).toBe(true);
  });

  it("isStandaloneMode may use the install flag for install-prompt UI only", async () => {
    installBrowserGlobals(false);
    const { isRunningAsInstalledPwa, isStandaloneMode, markPwaInstalled } =
      await import("@/lib/pwa/detect");

    markPwaInstalled();

    expect(isStandaloneMode()).toBe(true);
    expect(isRunningAsInstalledPwa()).toBe(false);
  });
});
