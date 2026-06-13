import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { SignupForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <AuthSplitLayout>
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
