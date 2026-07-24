export type PortalTabDirection = "next" | "prev" | null;

export type PortalTabNavItem = {
  href: string;
};

let pendingDirection: PortalTabDirection = null;

/** Set before a tab change so the incoming page can slide in the correct direction. */
export function setPortalTabDirection(direction: PortalTabDirection) {
  pendingDirection = direction;
}

/** Read and clear the pending swipe/tab direction (call once on route enter). */
export function consumePortalTabDirection(): PortalTabDirection {
  const direction = pendingDirection;
  pendingDirection = null;
  return direction;
}

export function peekPortalTabDirection(): PortalTabDirection {
  return pendingDirection;
}

export function getPortalTabIndex(
  items: readonly PortalTabNavItem[],
  activeHref: string | null
): number {
  if (!activeHref) return -1;
  return items.findIndex((item) => item.href === activeHref);
}

export function getAdjacentPortalTabHref(
  items: readonly PortalTabNavItem[],
  activeHref: string | null,
  direction: "next" | "prev"
): string | null {
  const index = getPortalTabIndex(items, activeHref);
  if (index < 0) return null;
  const nextIndex = direction === "next" ? index + 1 : index - 1;
  return items[nextIndex]?.href ?? null;
}

/**
 * Direction from current tab index to a target href.
 * `next` = higher index (content slides left); `prev` = lower index (slides right).
 */
export function getDirectionForTabHref(
  items: readonly PortalTabNavItem[],
  activeHref: string | null,
  targetHref: string
): PortalTabDirection {
  const current = getPortalTabIndex(items, activeHref);
  const target = items.findIndex((item) => item.href === targetHref);
  if (current < 0 || target < 0 || current === target) return null;
  return target > current ? "next" : "prev";
}

/** Swipe is only enabled on exact top-level tab routes (not nested pages / settings). */
export function isExactPortalTabRoute(
  items: readonly PortalTabNavItem[],
  pathname: string
): boolean {
  return items.some((item) => item.href === pathname);
}

const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a",
  "label",
  "option",
  "iframe",
  "video",
  "audio",
  "canvas",
  "[contenteditable='true']",
  "[contenteditable='']",
  "[role='button']",
  "[role='slider']",
  "[role='textbox']",
  "[role='combobox']",
  "[role='listbox']",
  "[role='menu']",
  "[role='dialog']",
  "[data-no-tab-swipe]",
  "[data-portal-no-swipe]",
  ".portal-table-scroll",
].join(",");

export function isPortalTabSwipeBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(INTERACTIVE_SELECTOR)) return true;
  return isInsideHorizontalScrollable(target);
}

function isInsideHorizontalScrollable(start: Element): boolean {
  let node: Element | null = start;
  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const { overflowX } = window.getComputedStyle(node);
      if (
        (overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") &&
        node.scrollWidth > node.clientWidth + 1
      ) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

export function isPortalTabSwipeViewport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const root = document.documentElement;
  if (root.dataset.portalMobile === "true" || root.dataset.pwaStandalone === "true") {
    return true;
  }

  try {
    if (window.matchMedia("(max-width: 1023px)").matches) return true;
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(pointer: coarse)").matches) return true;
  } catch {
    // matchMedia may be unavailable
  }

  return false;
}

type PortalTabNavigator = (href: string) => void;

let registeredNavigator: PortalTabNavigator | null = null;

/** PortalTabSwipe registers itself so the bottom nav (sibling) can drive the pager. */
export function registerPortalTabNavigator(navigator: PortalTabNavigator) {
  registeredNavigator = navigator;
  return () => {
    if (registeredNavigator === navigator) {
      registeredNavigator = null;
    }
  };
}

/** Returns true when the pager handled navigation (caller should prevent default link behavior). */
export function requestPortalTabNavigation(href: string): boolean {
  if (!registeredNavigator) return false;
  registeredNavigator(href);
  return true;
}
