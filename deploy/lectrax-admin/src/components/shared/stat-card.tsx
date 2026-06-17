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
    <Card className={cn("h-full min-w-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-3.5 pb-1.5 sm:p-6 sm:pb-2">
        <CardTitle
          className={cn(
            "min-w-0 text-xs font-medium leading-snug text-muted-foreground sm:text-sm",
            titleClassName
          )}
        >
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />}
      </CardHeader>
      <CardContent className="p-3.5 pt-0 sm:p-6 sm:pt-0">
        <div className="break-words text-lg font-bold sm:text-2xl">{value}</div>
        {subtitle && (
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
        {trend && <p className="mt-1 text-xs text-accent">{trend}</p>}
      </CardContent>
    </Card>
  );
}
