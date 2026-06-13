import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { LoginForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <AuthSplitLayout>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
