"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PortalMobileMenu } from "@/components/layout/portal-mobile-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Stable IDs — avoid useId() hydration mismatches for aria-controls. */
const PRODUCTS_MENU_ID = "landing-nav-products-menu";
const COMPANY_MENU_ID = "landing-nav-company-menu";

/** Switch to solid white after a small scroll. */
const SCROLL_SOLID_OFFSET = 8;

function readScrollY() {
  if (typeof window === "undefined") return 0;
  return Math.max(
    window.scrollY || 0,
    window.pageYOffset || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0
  );
}

type ProductLink = {
  label: string;
  href: string;
};

type CompanyLink = {
  label: string;
  href: string;
};

const PRODUCT_LINKS: ProductLink[] = [
  { label: "QR Attendance", href: "/products/qr-attendance" },
  { label: "Assignment Management", href: "/products/assignment-management" },
  { label: "Continuous Assessment", href: "/products/continuous-assessment" },
  { label: "Performance Analytics", href: "/products/performance-analytics" },
  { label: "Class Session Management", href: "/products/class-session-management" },
  { label: "Secure Academic Records", href: "/products/secure-academic-records" },
];

const COMPANY_LINKS: CompanyLink[] = [
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

type ScrollNavLink = {
  kind: "scroll";
  href: `#${string}`;
  label: string;
  sectionId: string;
};

type RouteNavLink = {
  kind: "route";
  href: string;
  label: string;
};

type NavLink = ScrollNavLink | RouteNavLink;

const SECONDARY_LINKS: NavLink[] = [
  { kind: "route", href: "/pricing", label: "Pricing" },
  { kind: "route", href: "/partnerships", label: "Partnerships" },
];

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function handlePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!ref.current || !target || ref.current.contains(target)) return;
      onOutside();
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
    };
  }, [enabled, onOutside, ref]);
}

export function LandingNav() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  const [clickedScrollSection, setClickedScrollSection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileCompanyOpen, setMobileCompanyOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close menus / clear home scroll highlight when the route changes (Compiler-safe).
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setProductsOpen(false);
    setCompanyOpen(false);
    setMobileProductsOpen(false);
    setMobileCompanyOpen(false);
    setClickedScrollSection(null);
    setScrolledPastHero(false);
    scrolledRef.current = false;
  }

  const isHome = pathname === "/";
  /** Solid white nav: always on inner pages; on home once the user scrolls. */
  const solid = !isHome || scrolledPastHero;
  const transparent = !solid;
  const mobileMenuOnHero = transparent;

  useClickOutside(productsRef, () => setProductsOpen(false), productsOpen);
  useClickOutside(companyRef, () => setCompanyOpen(false), companyOpen);

  useLayoutEffect(() => {
    const header = headerRef.current;

    const paint = (mode: "solid" | "hero") => {
      document.documentElement.dataset.landingNav = mode;
      if (!header) return;
      header.dataset.navMode = mode;
      if (mode === "solid") {
        header.style.backgroundColor = "#ffffff";
      } else {
        header.style.removeProperty("background-color");
      }
      header.classList.toggle("landing-nav--solid", mode === "solid");
      header.classList.toggle("landing-nav--hero", mode === "hero");
    };

    if (!isHome) {
      paint("solid");
      scrolledRef.current = true;
      setScrolledPastHero(true);
      return () => {
        delete document.documentElement.dataset.landingNav;
      };
    }

    const updateScrolled = () => {
      const next = readScrollY() > SCROLL_SOLID_OFFSET;
      paint(next ? "solid" : "hero");
      if (scrolledRef.current === next) return;
      scrolledRef.current = next;
      setScrolledPastHero(next);
    };

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    document.addEventListener("scroll", updateScrolled, { passive: true, capture: true });
    window.addEventListener("touchmove", updateScrolled, { passive: true });
    window.addEventListener("resize", updateScrolled, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrolled);
      document.removeEventListener("scroll", updateScrolled, true);
      window.removeEventListener("touchmove", updateScrolled);
      window.removeEventListener("resize", updateScrolled);
      delete document.documentElement.dataset.landingNav;
    };
  }, [isHome]);

  function isLinkActive(link: NavLink) {
    if (link.kind === "route") return pathname === link.href;
    return isHome && clickedScrollSection === link.sectionId;
  }

  function isCompanyActive() {
    return COMPANY_LINKS.some((link) => pathname === link.href);
  }

  function isProductsActive() {
    return pathname.startsWith("/products/");
  }

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleScrollNav(event: React.MouseEvent<HTMLAnchorElement>, link: ScrollNavLink) {
    setMobileOpen(false);
    setClickedScrollSection(link.sectionId);
    setProductsOpen(false);
    setCompanyOpen(false);

    if (!isHome) return;

    event.preventDefault();
    scrollToSection(link.sectionId);
  }

  function handleRouteNav() {
    setMobileOpen(false);
    setProductsOpen(false);
    setCompanyOpen(false);
    setMobileProductsOpen(false);
    setMobileCompanyOpen(false);
    setClickedScrollSection(null);
  }

  function triggerClass(active: boolean, mobile = false) {
    const onHero = transparent || (mobile && mobileMenuOnHero);

    return cn(
      mobile
        ? "flex min-h-12 w-full items-center justify-between rounded-xl px-3 py-3 text-base font-medium transition-colors"
        : "inline-flex items-center gap-1 text-sm font-medium transition-colors",
      onHero
        ? active
          ? "text-emerald-300"
          : mobile
            ? "text-white/85 hover:bg-white/10"
            : "text-white/90 hover:text-white"
        : active
          ? mobile
            ? "bg-primary/5 text-primary"
            : "text-primary"
          : mobile
            ? "text-slate-800 hover:bg-slate-50"
            : "text-slate-800 hover:text-primary"
    );
  }

  function navLinkClass(link: NavLink, mobile = false) {
    return triggerClass(isLinkActive(link), mobile);
  }

  function dropdownPanelClass(mobile = false) {
    if (mobile) {
      return cn(
        "mt-1 space-y-0.5 rounded-xl px-1 py-1",
        mobileMenuOnHero ? "bg-white/5" : "bg-slate-50"
      );
    }

    return cn(
      "absolute left-1/2 top-full z-50 mt-3 w-64 -translate-x-1/2 overflow-hidden rounded-xl border py-2 shadow-lg",
      transparent
        ? "border-white/15 bg-[#0B3D91]/95 text-white backdrop-blur-md"
        : "border-slate-200 bg-white text-slate-800"
    );
  }

  function dropdownItemClass(mobile = false, active = false) {
    const onHero = transparent || (mobile && mobileMenuOnHero);

    return cn(
      mobile
        ? "flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        : "block px-4 py-2.5 text-sm font-medium transition-colors",
      onHero
        ? active
          ? "bg-white/10 text-emerald-300"
          : mobile
            ? "text-white/80 hover:bg-white/10"
            : "text-white/90 hover:bg-white/10 hover:text-white"
        : active
          ? "bg-primary/5 text-primary"
          : mobile
            ? "text-slate-800 hover:bg-white"
            : "text-slate-800 hover:bg-slate-50 hover:text-primary"
    );
  }

  function renderNavLink(link: NavLink, mobile = false) {
    if (link.kind === "route") {
      return (
        <Link
          key={link.href}
          href={link.href}
          role={mobile ? "menuitem" : undefined}
          onClick={handleRouteNav}
          className={navLinkClass(link, mobile)}
        >
          {link.label}
        </Link>
      );
    }

    return (
      <Link
        key={link.href}
        href={`/${link.href}`}
        role={mobile ? "menuitem" : undefined}
        onClick={(event) => handleScrollNav(event, link)}
        className={navLinkClass(link, mobile)}
      >
        {link.label}
      </Link>
    );
  }

  function renderDesktopDropdown({
    label,
    open,
    setOpen,
    menuId,
    containerRef,
    active,
    children,
  }: {
    label: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    menuId: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
    active: boolean;
    children: React.ReactNode;
  }) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="menu"
          onClick={() => setOpen(!open)}
          className={triggerClass(active || open)}
        >
          {label}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {open ? (
          <div id={menuId} role="menu" className={dropdownPanelClass()}>
            {children}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <header
      ref={headerRef}
      className={cn(
        "landing-nav-safe top-0 left-0 right-0 z-50 transition-[background-color,box-shadow,border-color] duration-300",
        isHome ? "fixed landing-nav-home" : "sticky",
        transparent ? "landing-nav--hero" : "landing-nav--solid"
      )}
      data-nav-mode={transparent ? "hero" : "solid"}
      aria-label="Site"
    >
      <div className="landing-nav-inner mx-auto flex h-16 max-w-7xl items-center justify-between">
        <Logo
          iconWithBackground
          variant={transparent ? "light" : "default"}
        />

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex"
          aria-label="Main"
        >
          {renderDesktopDropdown({
            label: "Products",
            open: productsOpen,
            setOpen: (open) => {
              setProductsOpen(open);
              if (open) setCompanyOpen(false);
            },
            menuId: PRODUCTS_MENU_ID,
            containerRef: productsRef,
            active: isProductsActive(),
            children: PRODUCT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={handleRouteNav}
                className={dropdownItemClass(false, pathname === link.href)}
              >
                {link.label}
              </Link>
            )),
          })}

          {renderDesktopDropdown({
            label: "Company",
            open: companyOpen,
            setOpen: (open) => {
              setCompanyOpen(open);
              if (open) setProductsOpen(false);
            },
            menuId: COMPANY_MENU_ID,
            containerRef: companyRef,
            active: isCompanyActive(),
            children: COMPANY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={handleRouteNav}
                className={dropdownItemClass(false, pathname === link.href)}
              >
                {link.label}
              </Link>
            )),
          })}

          {SECONDARY_LINKS.map((link) => renderNavLink(link))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            asChild
            className={cn(
              transparent
                ? "text-white hover:bg-white/10 hover:text-white"
                : "text-slate-700 hover:bg-slate-100 hover:text-primary"
            )}
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="accent" className="rounded-xl" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>

        <button
          type="button"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors md:hidden",
            transparent
              ? "bg-white/10 text-white hover:bg-white/15"
              : "landing-icon-bg text-slate-700 hover:bg-slate-100"
          )}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-haspopup="menu"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <PortalMobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ariaLabel="Landing navigation"
        panelClassName={cn(
          mobileMenuOnHero &&
            "bg-gradient-to-br from-[#0B3D91] via-[#0F4DA8] to-[#0A3580] text-white"
        )}
      >
        <div className="flex items-center justify-between px-1 py-3">
          <Logo variant={mobileMenuOnHero ? "light" : "default"} iconWithBackground />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              mobileMenuOnHero
                ? "text-white/80 hover:bg-white/10"
                : "text-muted-foreground hover:bg-slate-50"
            )}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-3" aria-label="Mobile">
          <div>
            <button
              type="button"
              aria-expanded={mobileProductsOpen}
              onClick={() => {
                setMobileProductsOpen((open) => !open);
                setMobileCompanyOpen(false);
              }}
              className={triggerClass(isProductsActive() || mobileProductsOpen, true)}
            >
              Products
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  mobileProductsOpen && "rotate-180"
                )}
                aria-hidden
              />
            </button>
            {mobileProductsOpen ? (
              <div className={dropdownPanelClass(true)}>
                {PRODUCT_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={handleRouteNav}
                    className={dropdownItemClass(true, pathname === link.href)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              aria-expanded={mobileCompanyOpen}
              onClick={() => {
                setMobileCompanyOpen((open) => !open);
                setMobileProductsOpen(false);
              }}
              className={triggerClass(isCompanyActive() || mobileCompanyOpen, true)}
            >
              Company
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  mobileCompanyOpen && "rotate-180"
                )}
                aria-hidden
              />
            </button>
            {mobileCompanyOpen ? (
              <div className={dropdownPanelClass(true)}>
                {COMPANY_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={handleRouteNav}
                    className={dropdownItemClass(true, pathname === link.href)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {SECONDARY_LINKS.map((link) => renderNavLink(link, true))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 px-1 py-3">
          <Button
            variant="default"
            asChild
            className={cn(
              "h-12 w-full rounded-xl",
              mobileMenuOnHero
                ? "bg-white text-primary hover:bg-white/90"
                : "bg-primary text-white hover:bg-primary/90"
            )}
          >
            <Link href="/login" role="menuitem" onClick={handleRouteNav}>
              Sign in
            </Link>
          </Button>
          <Button variant="accent" asChild className="h-12 w-full rounded-xl">
            <Link href="/signup" role="menuitem" onClick={handleRouteNav}>
              Get Started
            </Link>
          </Button>
        </div>
      </PortalMobileMenu>
    </header>
  );
}
