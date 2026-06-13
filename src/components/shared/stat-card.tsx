import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  titleClassName,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("text-sm font-medium text-muted-foreground", titleClassName)}>
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-accent" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {trend && <p className="mt-1 text-xs text-accent">{trend}</p>}
      </CardContent>
    </Card>
  );
}
