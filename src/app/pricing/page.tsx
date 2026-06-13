import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BILLING_PLAN_PRICES } from "@/types/database";
import { BILLING_PLANS } from "@/lib/subscription/constants";
import { Check } from "lucide-react";

const premiumPlans = [
  { id: "monthly" as const, ...BILLING_PLANS.monthly, popular: false },
  { id: "semester" as const, ...BILLING_PLANS.semester, popular: true },
  { id: "annual" as const, ...BILLING_PLANS.annual, popular: false },
];

const freeFeatures = [
  "Up to 2 active class sessions",
  "Up to 50 students per session",
  "QR & manual attendance",
  "1 test & 1 assignment",
  "Manual assignment grading",
  "CA calculation & export",
];

const premiumFeatures = [
  "Unlimited sessions & students",
  "Unlimited tests & assignments",
  "Student assignment uploads",
  "Analytics dashboard",
  "Audit logs",
  "All Lectrax features",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade to Lectrax Premium when you need more. Students always use Lectrax for free.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free Plan</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$0</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/signup?role=lecturer">Get Started Free</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-accent">
            <CardHeader>
              <Badge variant="accent">Premium</Badge>
              <CardTitle>Premium Plan</CardTitle>
              <CardDescription>Unlock the full Lectrax experience</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {premiumFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {premiumPlans.map((plan) => (
            <Card key={plan.id} className={plan.popular ? "border-accent ring-2 ring-accent" : ""}>
              <CardHeader>
                {plan.popular && <Badge variant="accent">Best Value</Badge>}
                <CardTitle>{plan.label}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    ${BILLING_PLAN_PRICES[plan.id]}
                  </span>
                </CardDescription>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardFooter>
                <Button className="w-full" variant={plan.popular ? "accent" : "default"} asChild>
                  <Link href="/signup?role=lecturer">Upgrade</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Payments via Orange Money, Afrimoney, and local wallets through Monime.
        </p>
      </div>
    </div>
  );
}
