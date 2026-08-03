"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { classSessionSchema, type ClassSessionInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { useAsyncAction } from "@/hooks/use-async-action";
import { DeferredSelect } from "@/components/shared/deferred-select";

const SEMESTER_LABELS: Record<ClassSessionInput["semester"], string> = {
  full_year: "Full Academic Year",
  first_semester: "First Semester",
  second_semester: "Second Semester",
};

type CreateSessionFormProps = {
  defaultAcademicYear: string;
};

export function CreateSessionForm({ defaultAcademicYear }: CreateSessionFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { isPending, run } = useAsyncAction();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ClassSessionInput>({
    resolver: zodResolver(classSessionSchema),
    defaultValues: {
      courseCode: "",
      semester: "full_year",
      academicYear: defaultAcademicYear,
    },
  });

  const semester = useWatch({ control, name: "semester" });

  function onSubmit(data: ClassSessionInput) {
    setSubmitError(null);

    void run(async () => {
      const res = await appFetch("/api/lecturer/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = (await res.json()) as { error?: string; session?: { id: string } };

      if (!res.ok || !result.session) {
        setSubmitError(result.error ?? "Could not create class session. Please try again.");
        throw new Error("CREATE_SESSION_FAILED");
      }

      router.push(`/lecturer/sessions/${result.session.id}`);
    }, { holdOnSuccess: true }).catch((error: unknown) => {
      if (error instanceof Error && error.message === "CREATE_SESSION_FAILED") return;
      setSubmitError("Could not create class session. Please try again.");
    });
  }

  return (
    <Card className={lecturerPortalCardClass}>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
          <fieldset disabled={isPending} className="min-w-0 space-y-4 border-0 p-0">
            <div>
              <Label>Class</Label>
              <Input {...register("className")} placeholder="e.g. Pre BSc in Nursing" />
              {errors.className && (
                <p className="text-sm text-destructive">{errors.className.message}</p>
              )}
            </div>
            <div>
              <Label>Course Title</Label>
              <Input {...register("title")} placeholder="e.g. Introduction to Computer Science" />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div>
              <Label>Course Code (optional)</Label>
              <Input {...register("courseCode")} placeholder="e.g. CSC 101" />
              {errors.courseCode && (
                <p className="text-sm text-destructive">{errors.courseCode.message}</p>
              )}
            </div>
            <div>
              <Label>Semester</Label>
              <DeferredSelect placeholderLabel={SEMESTER_LABELS[semester ?? "full_year"]}>
                <Select
                  value={semester}
                  onValueChange={(v) => setValue("semester", v as ClassSessionInput["semester"])}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_year">Full Academic Year</SelectItem>
                    <SelectItem value="first_semester">First Semester</SelectItem>
                    <SelectItem value="second_semester">Second Semester</SelectItem>
                  </SelectContent>
                </Select>
              </DeferredSelect>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input {...register("academicYear")} placeholder="2025/2026" />
              {errors.academicYear && (
                <p className="text-sm text-destructive">{errors.academicYear.message}</p>
              )}
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <Button type="submit" loading={isPending}>
              {isPending ? "Creating..." : "Create Session"}
            </Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
