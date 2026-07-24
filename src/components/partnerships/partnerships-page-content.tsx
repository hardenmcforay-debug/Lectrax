"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PARTNERSHIP_PACKAGES } from "@/lib/partnerships/constants";
import type { PartnershipInquiryInput } from "@/lib/validations";
import { PartnershipInquiryForm } from "@/components/partnerships/partnership-inquiry-form";
import { cn } from "@/lib/utils";

export function PartnershipsPageContent() {
  const [selectedPackage, setSelectedPackage] =
    useState<PartnershipInquiryInput["selectedPackage"]>("medium");

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="border-b border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            University Partnerships
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Partner with Lectrax to provide your lecturers with a modern academic management platform
            for attendance, assessments, assignments, and student performance management.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Choose the right package for your department
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PARTNERSHIP_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedPackage(pkg.id)}
                className={cn(
                  "relative rounded-2xl border bg-white p-8 text-left shadow-sm transition-all hover:shadow-md",
                  selectedPackage === pkg.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-slate-200",
                  pkg.recommended && "border-2 border-accent ring-1 ring-accent/20"
                )}
              >
                {pkg.recommended && (
                  <Badge variant="accent" className="absolute -top-3 left-8">
                    Recommended
                  </Badge>
                )}
                <p className="text-xl font-bold text-slate-900">{pkg.name}</p>
                <p className="mt-2 text-sm font-medium text-primary">
                  Up to {pkg.lecturerLimit} Lecturers
                </p>
                <p className="mt-6 text-4xl font-bold text-slate-900">
                  ${pkg.price.toLocaleString()}
                  <span className="text-base font-normal text-slate-500"> / Academic Year</span>
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <PartnershipInquiryForm
            selectedPackage={selectedPackage}
            onPackageChange={setSelectedPackage}
          />
        </div>
      </section>
    </div>
  );
}
