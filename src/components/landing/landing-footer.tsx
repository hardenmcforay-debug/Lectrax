import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { FacebookLogo } from "@/components/contact/facebook-logo";
import { InstagramLogo } from "@/components/contact/instagram-logo";
import { LinkedInLogo } from "@/components/contact/linkedin-logo";
import { TikTokLogo } from "@/components/contact/tiktok-logo";
import { XLogo } from "@/components/contact/x-logo";
import { APP_NAME } from "@/lib/constants";
import { CONTACT_EMAIL, CONTACT_SOCIAL_LINKS } from "@/lib/contact/constants";
import { getProductNavLinks } from "@/lib/landing/products";

const productLinks = getProductNavLinks();

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact Us" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

const socialIcons = {
  facebook: FacebookLogo,
  x: XLogo,
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  linkedin: LinkedInLogo,
} as const;

const footerHeadingClass =
  "text-sm font-semibold uppercase tracking-wide text-white";
const footerLinkClass =
  "text-sm text-white/65 transition-colors duration-300 ease-out hover:text-white";

export function LandingFooter() {
  return (
    <footer
      className="relative mt-8 overflow-hidden rounded-t-[2.5rem] shadow-[0_-12px_40px_-16px_rgba(30,42,99,0.35)] sm:mt-10 sm:rounded-t-[3rem] lg:rounded-t-[3.5rem]"
      style={{
        background:
          "linear-gradient(165deg, #243070 0%, #1E2A63 42%, #18224F 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 15% 0%, rgba(255,255,255,0.08) 0%, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-2">
            <Logo iconWithBackground variant="light" />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
              {APP_NAME} is a modern academic management platform that simplifies attendance
              tracking, assessments, assignments, and student performance management for lecturers
              and institutions.
            </p>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Product</h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Company</h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Legal</h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Contact</h3>
            <p className="mt-4 text-sm text-white/65">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="transition-colors duration-300 ease-out hover:text-white"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <div className="mt-4 grid grid-cols-5 items-center gap-2">
              {CONTACT_SOCIAL_LINKS.map((social) => {
                const SocialIcon = socialIcons[social.id];
                return (
                  <a
                    key={social.id}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-11 w-11 items-center justify-center justify-self-center rounded-full bg-[#2A3A7A] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 ease-out hover:bg-[#354890] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.35)]"
                  >
                    <SocialIcon className="h-6 w-6" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-white/45">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
