"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { partnershipInquirySchema, type PartnershipInquiryInput } from "@/lib/validations";
import { PARTNERSHIP_PACKAGES, PARTNERSHIP_SUCCESS_MESSAGE } from "@/lib/partnerships/constants";
import { UniversityPartnershipsLogo } from "@/components/contact/university-partnerships-logo";

const formInputClass =
  "h-11 rounded-xl border-slate-200 bg-white px-4 text-sm transition-all placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const formLabelClass = "text-sm font-medium text-slate-700";

type PartnershipInquiryFormProps = {
  selectedPackage: PartnershipInquiryInput["selectedPackage"];
  onPackageChange: (pkg: PartnershipInquiryInput["selectedPackage"]) => void;
};

export function PartnershipInquiryForm({
  selectedPackage,
  onPackageChange,
}: PartnershipInquiryFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PartnershipInquiryInput>({
    resolver: zodResolver(partnershipInquirySchema),
    defaultValues: {
      selectedPackage,
    },
  });

  useEffect(() => {
    setValue("selectedPackage", selectedPackage);
  }, [selectedPackage, setValue]);

  async function onSubmit(data: PartnershipInquiryInput) {
    setSubmitError(null);

    try {
      const response = await appFetch("/api/partnerships/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let result: { error?: string } = {};
      try {
        result = (await response.json()) as { error?: string };
      } catch {
        setSubmitError("Could not submit your request. Please try again.");
        return;
      }

      if (!response.ok) {
        setSubmitError(result.error ?? "Could not submit your request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Could not submit your request. Please check your connection and try again.");
    }
  }

  function handlePackageSelect(pkg: PartnershipInquiryInput["selectedPackage"]) {
    onPackageChange(pkg);
    setValue("selectedPackage", pkg, { shouldValidate: true });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-6 w-6" aria-hidden />
        </div>
        <p className="mt-4 text-base leading-relaxed text-emerald-800">
          {PARTNERSHIP_SUCCESS_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <UniversityPartnershipsLogo className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
        <h2 className="text-lg font-semibold text-slate-900">University Inquiry Form</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="universityName" className={formLabelClass}>
              University Name
            </Label>
            <Input
              id="universityName"
              placeholder="University of Example"
              className={formInputClass}
              {...register("universityName")}
            />
            {errors.universityName && (
              <p className="text-sm text-destructive">{errors.universityName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="departmentName" className={formLabelClass}>
              Department Name
            </Label>
            <Input
              id="departmentName"
              placeholder="Computer Science"
              className={formInputClass}
              {...register("departmentName")}
            />
            {errors.departmentName && (
              <p className="text-sm text-destructive">{errors.departmentName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactPerson" className={formLabelClass}>
              Contact Person
            </Label>
            <Input
              id="contactPerson"
              placeholder="Dr. Jane Smith"
              className={formInputClass}
              {...register("contactPerson")}
            />
            {errors.contactPerson && (
              <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="positionRole" className={formLabelClass}>
              Position / Role
            </Label>
            <Input
              id="positionRole"
              placeholder="Head of Department"
              className={formInputClass}
              {...register("positionRole")}
            />
            {errors.positionRole && (
              <p className="text-sm text-destructive">{errors.positionRole.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partnershipEmail" className={formLabelClass}>
              Email Address
            </Label>
            <Input
              id="partnershipEmail"
              type="email"
              autoComplete="email"
              placeholder="contact@university.edu"
              className={formInputClass}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber" className={formLabelClass}>
              Phone Number
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              autoComplete="tel"
              placeholder="+232 74 567 *****"
              className={formInputClass}
              {...register("phoneNumber")}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expectedLecturers" className={formLabelClass}>
              Expected Number of Lecturers
            </Label>
            <Input
              id="expectedLecturers"
              type="number"
              min={1}
              placeholder="25"
              className={formInputClass}
              {...register("expectedLecturers")}
            />
            {errors.expectedLecturers && (
              <p className="text-sm text-destructive">{errors.expectedLecturers.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className={formLabelClass}>Selected Package</Label>
            <Select value={selectedPackage} onValueChange={handlePackageSelect}>
              <SelectTrigger className={formInputClass}>
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {PARTNERSHIP_PACKAGES.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.selectedPackage && (
              <p className="text-sm text-destructive">{errors.selectedPackage.message}</p>
            )}
          </div>
        </div>

        {submitError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{submitError}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl bg-[#1455C4] text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(20,85,196,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#0B3D91] hover:shadow-[0_14px_28px_-8px_rgba(11,61,145,0.5)] focus-visible:ring-[#1455C4] md:text-base"
        >
          {isSubmitting ? "Submitting..." : "Request Partnership"}
        </Button>
      </form>
    </div>
  );
}
