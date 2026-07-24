"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  consumePortalTabDirection,
  getDirectionForTabHref,
  getPortalTabIndex,
  isExactPortalTabRoute,
  isPortalTabSwipeBlockedTarget,
  isPortalTabSwipeViewport,
  registerPortalTabNavigator,
  setPortalTabDirection,
  type PortalTabNavItem,
} from "@/lib/portal/tab-navigation";

const SWIPE_ACTIVATION_PX = 14;
const SWIPE_COMMIT_RATIO = 0.22;
const SWIPE_COMMIT_MIN_PX = 56;
const SWIPE_VELOCITY_PX_PER_MS = 0.55;
const HORIZONTAL_LOCK_RATIO = 1.35;
const EDGE_RESISTANCE = 0.28;

type PortalTabSwipeProps = {
  items: readonly PortalTabNavItem[];
  getActiveHref: (pathname: string) => string | null;
  className?: string;
  children: ReactNode;
};

const springTransition = {
  type: "spring" as const,
  stiffness: 480,
  damping: 44,
  mass: 0.7,
};

/**
 * WhatsApp-style keep-alive tab pager.
 * Visited tabs stay mounted so swipes reveal real page content, not an empty shell.
 */
export function PortalTabSwipe({
  items,
  getActiveHref,
  className,
  children,
}: PortalTabSwipeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef(new Map<string, ReactNode>());
  const childrenRef = useRef<ReactNode>(children);
  const axisLockRef = useRef<"none" | "x" | "y">("none");
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    id: number;
    time: number;
  } | null>(null);
  const navigatingRef = useRef(false);
  const visualIndexRef = useRef(0);
  const widthRef = useRef(390);
  const pendingHrefRef = useRef<string | null>(null);

  const trackX = useMotionValue(0);
  const [swipeEnabled, setSwipeEnabled] = useState(false);
  const [isHorizontalDragging, setIsHorizontalDragging] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [visualIndex, setVisualIndex] = useState(0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [contentPath, setContentPath] = useState(pathname);

  const onExactTab = isExactPortalTabRoute(items, pathname);
  const activeHref = onExactTab ? pathname : getActiveHref(pathname);
  const routeIndex = getPortalTabIndex(items, activeHref);
  const canGesture = swipeEnabled && onExactTab && !reducedMotion && !pendingHref;

  const measureWidth = useCallback(() => {
    const width = containerRef.current?.offsetWidth;
    if (width && width > 0) {
      widthRef.current = width;
      return width;
    }
    return widthRef.current;
  }, []);

  const setTrackToIndex = useCallback(
    (index: number, dragOffset = 0) => {
      const width = measureWidth();
      trackX.set(-index * width + dragOffset);
    },
    [measureWidth, trackX]
  );

  useLayoutEffect(() => {
    visualIndexRef.current = visualIndex;
  }, [visualIndex]);

  useLayoutEffect(() => {
    pendingHrefRef.current = pendingHref;
  }, [pendingHref]);

  useLayoutEffect(() => {
    consumePortalTabDirection();
  }, [pathname]);

  // Cache only when `children` updates — that means the RSC payload matches pathname.
  useLayoutEffect(() => {
    if (!isExactPortalTabRoute(items, pathname)) return;

    const childrenChanged = childrenRef.current !== children;

    if (childrenChanged) {
      childrenRef.current = children;
      cacheRef.current.set(pathname, children);
      setContentPath(pathname);
      setCacheVersion((value) => value + 1);

      const targetIndex = items.findIndex((item) => item.href === pathname);
      const shouldSettle =
        pendingHrefRef.current === pathname || !navigatingRef.current;

      if (shouldSettle && targetIndex >= 0) {
        setVisualIndex(targetIndex);
        setTrackToIndex(targetIndex, 0);
        navigatingRef.current = false;
      }

      setPendingHref(null);
      return;
    }

    // Seed cache on first visit only when not waiting on a pending navigation.
    if (!cacheRef.current.has(pathname) && !pendingHrefRef.current) {
      cacheRef.current.set(pathname, children);
      setContentPath(pathname);
      setCacheVersion((value) => value + 1);
    }
  }, [children, items, pathname, setTrackToIndex]);

  // Link/back navigation onto an already-cached tab: show it immediately.
  useLayoutEffect(() => {
    if (!onExactTab || routeIndex < 0 || pendingHref) return;
    if (!cacheRef.current.has(pathname)) return;
    if (routeIndex === visualIndexRef.current) return;
    if (navigatingRef.current) return;

    setVisualIndex(routeIndex);
    setTrackToIndex(routeIndex, 0);
  }, [onExactTab, pathname, pendingHref, routeIndex, setTrackToIndex]);

  useEffect(() => {
    const sync = () => {
      setSwipeEnabled(isPortalTabSwipeViewport());
      setTrackToIndex(visualIndexRef.current, 0);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [setTrackToIndex]);

  useEffect(() => {
    if (!swipeEnabled) return;
    for (const item of items) {
      router.prefetch(item.href);
    }
  }, [items, router, swipeEnabled]);

  const goToHref = useCallback(
    (href: string) => {
      if (navigatingRef.current) return;
      if (href === items[visualIndexRef.current]?.href && href === pathname) return;

      const targetIndex = items.findIndex((item) => item.href === href);
      if (targetIndex < 0) return;

      const currentHref = items[visualIndexRef.current]?.href ?? pathname;
      const direction = getDirectionForTabHref(items, currentHref, href);
      if (direction) setPortalTabDirection(direction);

      const width = measureWidth();
      const hasCache = cacheRef.current.has(href);
      navigatingRef.current = true;
      setIsHorizontalDragging(false);
      axisLockRef.current = "none";
      pointerStartRef.current = null;

      const syncRoute = () => {
        startTransition(() => {
          router.push(href, { scroll: false });
        });
      };

      if (hasCache) {
        void animate(trackX, -targetIndex * width, {
          ...(reducedMotion ? { duration: 0 } : springTransition),
          onComplete: () => {
            setVisualIndex(targetIndex);
            setTrackToIndex(targetIndex, 0);
            syncRoute();
            navigatingRef.current = false;
          },
        });
        return;
      }

      // Uncached: keep the current page visible until the next page's content arrives.
      setPendingHref(href);
      void animate(trackX, -visualIndexRef.current * width, springTransition);
      syncRoute();
    },
    [items, measureWidth, pathname, reducedMotion, router, setTrackToIndex, trackX]
  );

  useEffect(() => registerPortalTabNavigator(goToHref), [goToHref]);

  const resetGesture = useCallback(() => {
    axisLockRef.current = "none";
    pointerStartRef.current = null;
    setIsHorizontalDragging(false);
    if (!navigatingRef.current) {
      void animate(trackX, -visualIndexRef.current * measureWidth(), springTransition);
    }
  }, [measureWidth, trackX]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canGesture || event.button !== 0) return;
      if (isPortalTabSwipeBlockedTarget(event.target)) return;
      if (navigatingRef.current) return;

      axisLockRef.current = "none";
      pointerStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
        time: event.timeStamp,
      };
    },
    [canGesture]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      if (!canGesture || !start || start.id !== event.pointerId) return;
      if (axisLockRef.current === "y") return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (axisLockRef.current === "none") {
        if (absX < SWIPE_ACTIVATION_PX && absY < SWIPE_ACTIVATION_PX) return;
        if (absY > absX * HORIZONTAL_LOCK_RATIO) {
          axisLockRef.current = "y";
          pointerStartRef.current = null;
          return;
        }
        if (absX > absY * HORIZONTAL_LOCK_RATIO) {
          axisLockRef.current = "x";
          setIsHorizontalDragging(true);
          const index = visualIndexRef.current;
          const peekHref = dx < 0 ? items[index + 1]?.href : items[index - 1]?.href;
          if (peekHref) router.prefetch(peekHref);
          try {
            containerRef.current?.setPointerCapture(event.pointerId);
          } catch {
            // ignore
          }
        } else {
          return;
        }
      }

      if (axisLockRef.current !== "x") return;
      event.preventDefault();

      const index = visualIndexRef.current;
      const width = measureWidth();
      const prevHref = items[index - 1]?.href;
      const nextHref = items[index + 1]?.href;
      const prevCached = prevHref ? cacheRef.current.has(prevHref) : false;
      const nextCached = nextHref ? cacheRef.current.has(nextHref) : false;

      let offset = dx;
      // Only peek into tabs that already have real content cached.
      if (dx < 0 && (!nextHref || !nextCached)) {
        offset = dx * EDGE_RESISTANCE;
      } else if (dx > 0 && (!prevHref || !prevCached)) {
        offset = dx * EDGE_RESISTANCE;
      } else {
        offset = Math.max(-width, Math.min(width, dx));
      }

      trackX.set(-index * width + offset);
    },
    [canGesture, items, measureWidth, router, trackX]
  );

  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      if (!start || start.id !== event.pointerId) {
        if (axisLockRef.current === "x") resetGesture();
        return;
      }

      const lockedX = axisLockRef.current === "x";
      const dx = event.clientX - start.x;
      const elapsed = Math.max(event.timeStamp - start.time, 1);
      const velocity = dx / elapsed;

      try {
        if (containerRef.current?.hasPointerCapture(event.pointerId)) {
          containerRef.current.releasePointerCapture(event.pointerId);
        }
      } catch {
        // ignore
      }

      if (!lockedX) {
        resetGesture();
        return;
      }

      const width = measureWidth();
      const commitDistance = Math.max(SWIPE_COMMIT_MIN_PX, width * SWIPE_COMMIT_RATIO);
      const index = visualIndexRef.current;
      const prevHref = items[index - 1]?.href;
      const nextHref = items[index + 1]?.href;

      const wantsNext = dx < -commitDistance || velocity < -SWIPE_VELOCITY_PX_PER_MS;
      const wantsPrev = dx > commitDistance || velocity > SWIPE_VELOCITY_PX_PER_MS;

      setIsHorizontalDragging(false);
      axisLockRef.current = "none";
      pointerStartRef.current = null;

      if (wantsNext && nextHref) {
        goToHref(nextHref);
        return;
      }
      if (wantsPrev && prevHref) {
        goToHref(prevHref);
        return;
      }

      void animate(trackX, -index * width, springTransition);
    },
    [goToHref, items, measureWidth, resetGesture, trackX]
  );

  if (!onExactTab) {
    return <div className={cn("portal-tab-swipe-root", className)}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "portal-tab-swipe-root",
        canGesture && "portal-tab-swipe-enabled",
        isHorizontalDragging && "is-horizontal-dragging",
        pendingHref && "portal-tab-swipe-pending",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      data-portal-tab-swipe={canGesture ? "true" : "false"}
      data-content-path={contentPath}
      data-cache-version={cacheVersion}
    >
      <motion.div className="portal-tab-swipe-track" style={{ x: trackX }}>
        {items.map((item, index) => {
          const isLive = item.href === contentPath;
          const cached = cacheRef.current.get(item.href);
          const content = isLive ? children : cached;
          const isActive = index === visualIndex;

          return (
            <div
              key={item.href}
              className={cn("portal-tab-swipe-panel", isActive && "is-active")}
              aria-hidden={!isActive}
              {...(!isActive ? { inert: true } : {})}
            >
              {content ?? <div className="portal-tab-swipe-panel-placeholder" />}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/** Call from bottom-nav Link clicks so tap navigation matches swipe slide direction. */
export function preparePortalTabNavigation(
  items: readonly PortalTabNavItem[],
  pathname: string,
  targetHref: string,
  getActiveHref: (pathname: string) => string | null
) {
  const direction = getDirectionForTabHref(items, getActiveHref(pathname), targetHref);
  setPortalTabDirection(direction);
}
