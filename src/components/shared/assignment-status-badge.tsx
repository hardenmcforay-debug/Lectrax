import { cn } from "@/lib/utils";

export function AssignmentOpenClosedBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        isOpen
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-red-600 bg-red-600 text-white"
      )}
    >
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}
