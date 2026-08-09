import type { BillingPlan } from "@/types/database";
import {
  formatDiscountPercent,
  getBillingPlanListPayPricing,
} from "@/lib/subscription/payment-currency";
import { cn } from "@/lib/utils";

type BillingPlanPriceBlockProps = {
  plan: BillingPlan;
  /** Show SLE list/pay under the USD block (lecturer subscribe cards). */
  showSle?: boolean;
  className?: string;
  payClassName?: string;
  align?: "center" | "start";
};

export function BillingPlanPriceBlock({
  plan,
  showSle = false,
  className,
  payClassName,
  align = "center",
}: BillingPlanPriceBlockProps) {
  const pricing = getBillingPlanListPayPricing(plan);
  const hasDiscount = pricing.discountPercent > 0;
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className={cn("flex flex-col gap-1", alignClass, className)}>
      {hasDiscount ? (
        <span className="inline-flex w-fit rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent sm:text-xs">
          Save {formatDiscountPercent(pricing.discountPercent)}
        </span>
      ) : null}
      {hasDiscount ? (
        <p className="text-sm text-slate-400 line-through sm:text-base">
          ${pricing.listUsd.toLocaleString("en-US")}
        </p>
      ) : null}
      <p className={cn("text-3xl font-bold text-primary", payClassName)}>
        ${pricing.payUsd.toLocaleString("en-US")}
      </p>
      {showSle ? (
        <p className="text-xs text-muted-foreground">
          {hasDiscount ? (
            <>
              <span className="mr-1.5 line-through opacity-70">
                Le {pricing.listSle.toLocaleString("en-US")}
              </span>
              <span>Le {pricing.paySle.toLocaleString("en-US")} at checkout</span>
            </>
          ) : (
            <>Charged as Le {pricing.paySle.toLocaleString("en-US")} at checkout</>
          )}
        </p>
      ) : null}
    </div>
  );
}
