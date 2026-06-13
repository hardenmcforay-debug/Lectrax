import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PartnershipsPageContent } from "@/components/partnerships/partnerships-page-content";
import "../landing.css";

export const metadata: Metadata = {
  title: "University Partnerships",
  description:
    "Partner with Lectrax to provide your lecturers with a modern academic management platform for attendance, assessments, assignments, and student performance management.",
};

export default function PartnershipsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <PartnershipsPageContent />
      </main>
      <LandingFooter />
    </div>
  );
}
