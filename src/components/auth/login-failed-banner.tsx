import Link from "next/link";

export function LoginFailedBanner({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
      Sign in failed. Please check your phone number or email and password.{" "}
      <Link href="/login" className="font-medium underline">
        Try again
      </Link>
    </div>
  );
}
