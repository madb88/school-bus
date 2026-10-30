import { type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { formatTimeInput } from "@/lib/child-schedule/match";

export const filterToggleActiveClass =
  "border-transparent bg-bus text-bus-foreground shadow-none hover:bg-bus/90 hover:text-bus-foreground dark:border-transparent dark:bg-bus dark:text-bus-foreground dark:hover:bg-bus/85 dark:hover:text-bus-foreground";

export function FilterFieldLabel({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Label
      id={id}
      className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
    >
      <Icon className="size-3.5 text-bus-deep" aria-hidden />
      {children}
    </Label>
  );
}

export function FilterTimeDisplay({
  value,
  emptyLabel,
}: {
  value: string | null | undefined;
  emptyLabel: string;
}) {
  return (
    <span
      className="inline-flex h-8 shrink-0 cursor-default items-center rounded-lg bg-muted/70 px-2.5 text-sm tabular-nums text-muted-foreground"
      title="Godzina z planu lekcji — tylko do odczytu"
    >
      <span className={value ? "text-foreground" : undefined}>
        {value ? formatTimeInput(value) : emptyLabel}
      </span>
    </span>
  );
}
