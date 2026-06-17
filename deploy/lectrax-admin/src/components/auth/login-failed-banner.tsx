"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function Banner() {
  const searchParams = useSearchParams();
  if (searchParams.get("login_failed") === "1" || searchParams.get("error") === "auth") {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
        Sign in failed. Please check your email and password.{" "}
        <Link href="/login" className="font-medium underline">
          Try again
        </Link>
      </div>
    );
  }

  return null;
}

export function LoginFailedBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
}
