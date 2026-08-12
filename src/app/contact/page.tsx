import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import { publicPageMetadata } from "@/lib/seo/metadata";
import "../landing.css";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact Us",
  description:
    "Get in touch with the Lectrax team for product questions, support, or general inquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <ContactPageContent />
      </main>
      <LandingFooter />
    </div>
  );
}
