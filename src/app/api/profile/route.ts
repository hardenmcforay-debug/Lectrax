import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validations";
import { normalizePhoneNumber } from "@/lib/auth/phone-number";
import { applyRecoveryEmailUpdate } from "@/lib/auth/recovery-email";
import { canEditRecoveryEmail, getRecoveryEmailDisplay } from "@/lib/auth/phone-number";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

type ProfileResponse = {
  id: string;
  full_name: string;
  phone: string | null;
  college_id: string | null;
  role: string;
  email: string;
  created_at: string;
  updated_at?: string;
  recoveryEmail: string;
  recoveryEmailEditable: boolean;
};

function buildProfileResponse(
  profile: {
    id: string;
    full_name: string;
    phone: string | null;
    college_id: string | null;
    role: string;
    email: string;
    created_at: string;
    updated_at?: string;
  },
  authEmail: string | null | undefined,
  userMetadata?: Record<string, unknown>
): ProfileResponse {
  return {
    ...profile,
    recoveryEmail: getRecoveryEmailDisplay(profile.email),
    recoveryEmailEditable: canEditRecoveryEmail({
      authEmail,
      profilePhone: profile.phone,
      userMetadata,
    }),
  };
}

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
    return NextResponse.json(
      { error: sanitizeErrorMessage(error.message) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    profile: profile ? buildProfileResponse(profile, user.email, user.user_metadata) : null,
  });
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

  const { fullName, phone, collegeId, recoveryEmail } = parsed.data;
  const trimmedName = fullName;
  let trimmedPhone: string | null = null;

  if (phone) {
    try {
      trimmedPhone = normalizePhoneNumber(phone);
    } catch {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }
  }

  const service = await createServiceClient();
  const { data: existing, error: readError } = await service
    .from("profiles")
    .select("id, role, phone, email")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(readError.message) },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json(
      {
        error:
          "Profile not found. Please sign out and sign in again, or contact support if this persists.",
      },
      { status: 404 }
    );
  }

  if (trimmedPhone) {
    const { data: phoneConflict, error: phoneConflictError } = await service
      .from("profiles")
      .select("id")
      .eq("phone", trimmedPhone)
      .neq("id", user.id)
      .maybeSingle();

    if (phoneConflictError) {
      return NextResponse.json(
        { error: sanitizeErrorMessage(phoneConflictError.message) },
        { status: 500 }
      );
    }

    if (phoneConflict) {
      return NextResponse.json(
        {
          error: "Phone Number Already Registered",
          message: "An account already exists with this phone number.",
        },
        { status: 409 }
      );
    }
  }

  const role = existing.role;

  const recoveryEmailEditable = canEditRecoveryEmail({
    authEmail: user.email,
    profilePhone: trimmedPhone ?? existing?.phone ?? null,
    userMetadata: user.user_metadata,
  });

  if (recoveryEmail && recoveryEmailEditable) {
    const recoveryResult = await applyRecoveryEmailUpdate(user.id, recoveryEmail, service);
    if (!recoveryResult.ok) {
      return NextResponse.json(
        {
          error: recoveryResult.error,
          message: recoveryResult.message,
        },
        { status: recoveryResult.status }
      );
    }
  }

  const payload: Record<string, string | boolean | null> = {
    full_name: trimmedName,
    phone: trimmedPhone,
  };

  if (role === "student") {
    payload.college_id = collegeId ?? null;
  }

  const { data, error } = await service
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id, full_name, phone, college_id, role, email, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error.message) },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Profile could not be updated. Please try again." },
      { status: 500 }
    );
  }

  const savedProfile = data;

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: trimmedName },
  });

  if (authError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(authError.message) },
      { status: 500 }
    );
  }

  revalidatePath("/student");
  revalidatePath("/student/settings");
  revalidatePath("/student/academic-overview");
  revalidatePath("/lecturer/settings");

  return NextResponse.json({
    profile: buildProfileResponse(savedProfile, user.email, user.user_metadata),
  });
}
