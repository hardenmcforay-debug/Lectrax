import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCOUNT_DELETE_CONFIRMATION_PHRASE,
  deleteUserAccount,
} from "@/lib/account/delete-account";
import { requireAuthenticatedUser } from "@/lib/auth/require-api-role";
import { rejectIfUserRateLimited } from "@/lib/security/enforce-rate-limit";
import { parseJsonBody } from "@/lib/security/parse-request";

const deleteAccountBodySchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmationPhrase: z
    .string()
    .trim()
    .refine(
      (value) => value.toUpperCase() === ACCOUNT_DELETE_CONFIRMATION_PHRASE,
      `Type ${ACCOUNT_DELETE_CONFIRMATION_PHRASE} to confirm`
    ),
});

export async function DELETE(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.error) return auth.error;

  const limited = rejectIfUserRateLimited(
    auth.userId,
    "accountDeletion",
    "account_deletion"
  );
  if (limited) return limited;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = deleteAccountBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const result = await deleteUserAccount({
    user: auth.user,
    service: auth.service,
    userClient: auth.supabase,
    password: parsed.data.password,
    confirmationPhrase: parsed.data.confirmationPhrase,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    message: "Your account has been permanently deleted.",
  });
}
