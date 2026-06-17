import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-form";
import { InstallAppButton } from "@/components/pwa/install-app-button";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">Platform Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to manage Lectrax.</p>
        </div>
        <Suspense>
          <LoginForm adminOnly />
        </Suspense>
        <div className="mt-6 flex justify-center">
          <InstallAppButton />
        </div>
      </div>
    </div>
  );
}
