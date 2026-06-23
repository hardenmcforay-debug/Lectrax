"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PortalMobileMenu } from "@/components/layout/portal-mobile-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const NAV_LINKS: NavLink[] = [
  { kind: "route", href: "/about", label: "About" },
  { kind: "scroll", href: "#features", label: "Features", sectionId: "features" },
  { kind: "scroll", href: "#solutions", label: "Solutions", sectionId: "solutions" },
  { kind: "scroll", href: "#pricing", label: "Pricing", sectionId: "pricing" },
  { kind: "route", href: "/partnerships", label: "Partnerships" },
  { kind: "route", href: "/contact", label: "Contact" },
];

export function LandingNav() {
  const pathname = usePathname();
  const [clickedScrollSection, setClickedScrollSection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";
  const transparent = isHome && !scrolled;
  const mobileMenuOnHero = transparent;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isHome) return;

    function onScroll() {
      setScrolled(window.scrollY > 48);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) {
      setClickedScrollSection(null);
    }
  }, [isHome]);

  function isLinkActive(link: NavLink) {
    if (link.kind === "route") return pathname === link.href;
    return isHome && clickedScrollSection === link.sectionId;
  }

  function handleScrollNav(event: React.MouseEvent<HTMLAnchorElement>, link: ScrollNavLink) {
    setMobileOpen(false);
    setClickedScrollSection(link.sectionId);

    if (!isHome) return;

    event.preventDefault();
    document.getElementById(link.sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleRouteNav() {
    setMobileOpen(false);
    setClickedScrollSection(null);
  }

  function navLinkClass(link: NavLink, mobile = false) {
    const active = isLinkActive(link);
    const onHero = transparent || (mobile && mobileMenuOnHero);

    return cn(
      mobile
        ? "flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-medium transition-colors"
        : "text-sm font-medium transition-colors",
      onHero
        ? active
          ? "text-emerald-300"
          : mobile
            ? "text-white/85 hover:bg-white/10"
            : "text-white/80 hover:text-white"
        : active
          ? mobile
            ? "bg-primary/5 text-primary"
            : "text-primary"
          : mobile
            ? "text-slate-600 hover:bg-slate-50"
            : "text-slate-600 hover:text-primary"
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

  return (
    <header
      className={cn(
        "landing-nav-safe top-0 left-0 right-0 z-50 transition-all duration-300",
        isHome ? "fixed" : "sticky",
        transparent ? "bg-transparent" : "landing-nav-glass bg-white"
      )}
    >
      <div className="landing-nav-inner mx-auto flex h-16 max-w-7xl items-center justify-between">
        <Logo iconWithBackground variant={transparent ? "light" : "default"} />

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex"
          aria-label="Main"
        >
          {NAV_LINKS.map((link) => renderNavLink(link))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            asChild
            className={cn(transparent && "text-white hover:bg-white/10 hover:text-white")}
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
            "inline-flex h-10 w-10 items-center justify-center rounded-lg md:hidden",
            transparent ? "bg-white/10 text-white" : "landing-icon-bg"
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
        <div
          className={cn(
            "flex items-center justify-between border-b px-1 py-3",
            mobileMenuOnHero ? "border-white/10" : "border-slate-100"
          )}
        >
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
          {NAV_LINKS.map((link) => renderNavLink(link, true))}
        </nav>

        <div
          className={cn(
            "mt-auto flex flex-col gap-2 border-t px-1 py-3",
            mobileMenuOnHero ? "border-white/10" : "border-slate-100"
          )}
        >
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
