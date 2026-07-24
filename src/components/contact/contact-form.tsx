"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageLogo } from "@/components/contact/message-logo";
import { contactInquirySchema, type ContactInquiryInput } from "@/lib/validations";
import { CONTACT_SUCCESS_MESSAGE } from "@/lib/contact/constants";
import { cn } from "@/lib/utils";

const formInputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm transition-all placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

const formLabelClass = "text-sm font-medium text-slate-700";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInquiryInput>({
    resolver: zodResolver(contactInquirySchema),
  });

  async function onSubmit(data: ContactInquiryInput) {
    setSubmitError(null);

    const response = await appFetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSubmitError(result.error ?? "Could not send your message. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-6 w-6" aria-hidden />
        </div>
        <p className="mt-4 text-base leading-relaxed text-emerald-800">{CONTACT_SUCCESS_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <MessageLogo className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
        <h2 className="text-lg font-semibold text-slate-900">Send us a message</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className={formLabelClass}>
              Full Name
            </Label>
            <Input
              id="fullName"
              placeholder="Your name"
              className={formInputClass}
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className={formLabelClass}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your Email"
              className={formInputClass}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <textarea
            id="message"
            rows={5}
            placeholder="Message"
            aria-label="Message"
            className={cn(
              formInputClass,
              "h-auto min-h-[140px] resize-none py-3 leading-relaxed"
            )}
            {...register("message")}
          />
          {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
        </div>

        {submitError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{submitError}</p>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          variant="accent"
          className="h-11 w-full rounded-xl text-sm font-semibold md:text-base"
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </div>
  );
}
