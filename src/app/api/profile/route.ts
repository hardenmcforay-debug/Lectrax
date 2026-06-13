import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  collegeId: z.string().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const service = await createServiceClient();
  const { data: profile, error } = await service
    .from("profiles")
    .select("id, full_name, phone, college_id, role, email, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid profile data" },
      { status: 400 }
    );
  }

  const { fullName, phone, collegeId } = parsed.data;
  const trimmedName = fullName.trim();
  const trimmedPhone = phone?.trim() || null;

  const service = await createServiceClient();
  const { data: existing, error: readError } = await service
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const role =
    existing?.role ??
    (user.user_metadata?.role === "lecturer"
      ? "lecturer"
      : user.user_metadata?.role === "platform_admin"
        ? "platform_admin"
        : "student");

  const payload: Record<string, string | boolean | null> = {
    full_name: trimmedName,
    phone: trimmedPhone,
  };

  if (role === "student" || collegeId !== undefined) {
    payload.college_id = collegeId?.trim() || null;
  }

  let savedProfile;

  if (!existing) {
    const { data, error } = await service
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email ?? `${user.id}@users.local`,
        full_name: trimmedName,
        phone: trimmedPhone,
        college_id: role === "student" ? collegeId?.trim() || null : null,
        role,
        is_active: true,
      })
      .select("id, full_name, phone, college_id, role, email, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    savedProfile = data;
  } else {
    const { data, error } = await service
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("id, full_name, phone, college_id, role, email, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Profile could not be updated. Please try again." },
        { status: 500 }
      );
    }

    savedProfile = data;
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: trimmedName },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  revalidatePath("/student");
  revalidatePath("/student/settings");
  revalidatePath("/student/academic-overview");
  revalidatePath("/lecturer/settings");

  return NextResponse.json({ profile: savedProfile });
}
