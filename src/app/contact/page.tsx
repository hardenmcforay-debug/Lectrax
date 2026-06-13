import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import "../landing.css";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Lectrax team for product questions, support, or general inquiries.",
};

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
