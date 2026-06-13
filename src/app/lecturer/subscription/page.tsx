import { Suspense } from "react";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { SubscriptionPageContent } from "@/components/lecturer/subscription-page-content";
import { getSubscriptionPageInitialData } from "@/lib/subscription/subscription-page-data";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = await requireAuthenticatedUser();

  const initialData = await getSubscriptionPageInitialData(user.id);

  return (
    <Suspense>
      <SubscriptionPageContent initialData={initialData} />
    </Suspense>
  );
}
