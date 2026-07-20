import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { EmailLogo } from "@/components/contact/email-logo";
import { FacebookLogo } from "@/components/contact/facebook-logo";
import { InstagramLogo } from "@/components/contact/instagram-logo";
import { LinkedInLogo } from "@/components/contact/linkedin-logo";
import { ResponseTimeLogo } from "@/components/contact/response-time-logo";
import { TikTokLogo } from "@/components/contact/tiktok-logo";
import { UniversityPartnershipsLogo } from "@/components/contact/university-partnerships-logo";
import { XLogo } from "@/components/contact/x-logo";
import { CONTACT_EMAIL, CONTACT_SOCIAL_LINKS } from "@/lib/contact/constants";

type ContactChannel = {
  title: string;
  description: string;
  value: string;
  href?: string;
  icon?: LucideIcon;
  customIcon?: "gmail" | "response" | "partnerships";
};

const socialIcons = {
  facebook: FacebookLogo,
  x: XLogo,
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  linkedin: LinkedInLogo,
} as const;

const contactChannels: ContactChannel[] = [
  {
    customIcon: "gmail",
    title: "Email",
    description: "Reach our team directly for product questions, support, or general inquiries.",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    customIcon: "response",
    title: "Response Time",
    description: "We typically respond to messages within 1–2 business days.",
    value: "Monday – Friday",
  },
  {
    customIcon: "partnerships",
    title: "University Partnerships",
    description: "Looking to onboard your department? Visit our partnerships page for annual plans.",
    value: "Request Partnership",
    href: "/partnerships",
  },
];

export function ContactPageContent() {
  return (
    <div className="bg-white">
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Contact Us
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Get in touch through any of the channels below.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-6">
              <div className="grid gap-4">
                {contactChannels.map((channel) => {
                  const Icon = channel.icon;

                  if (channel.customIcon === "gmail") {
                    return (
                      <div
                        key={channel.title}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                          <a
                            href={channel.href}
                            aria-label={`Email ${channel.value}`}
                            className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-slate-100 px-3 py-4 text-center transition-colors hover:border-slate-400 hover:bg-slate-200/80 sm:py-5"
                          >
                            <EmailLogo className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
                            <span className="text-sm font-semibold text-slate-800">Email</span>
                            <span className="break-all text-xs font-medium text-slate-600">
                              {channel.value}
                            </span>
                          </a>
                          {CONTACT_SOCIAL_LINKS.map((social) => {
                            const SocialIcon = socialIcons[social.id];
                            return (
                              <a
                                key={social.id}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.label}
                                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-slate-100 px-3 py-4 text-center transition-colors hover:border-slate-400 hover:bg-slate-200/80 sm:py-5"
                              >
                                <SocialIcon className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
                                <span className="text-sm font-semibold text-slate-800">
                                  {social.label}
                                </span>
                                {social.handle ? (
                                  <span className="break-all text-xs font-medium text-slate-600">
                                    {social.handle}
                                  </span>
                                ) : null}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  const content = (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-start gap-4">
                        <div
                          className={
                            channel.customIcon === "response" ||
                            channel.customIcon === "partnerships"
                              ? "flex h-14 w-14 shrink-0 items-center justify-center"
                              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                          }
                        >
                          {channel.customIcon === "response" ? (
                            <ResponseTimeLogo className="h-12 w-12 sm:h-14 sm:w-14" />
                          ) : channel.customIcon === "partnerships" ? (
                            <UniversityPartnershipsLogo className="h-12 w-12 sm:h-14 sm:w-14" />
                          ) : Icon ? (
                            <Icon className="h-5 w-5" aria-hidden />
                          ) : null}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{channel.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">{channel.description}</p>
                          <p className="mt-3 text-sm font-medium text-primary">{channel.value}</p>
                        </div>
                      </div>
                    </div>
                  );

                  if (channel.href) {
                    return (
                      <Link key={channel.title} href={channel.href} className="block">
                        {content}
                      </Link>
                    );
                  }

                  return <div key={channel.title}>{content}</div>;
                })}
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
