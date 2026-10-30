"use client";

import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export function FieldHelpHint({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
          {icon}
          {title}
        </h2>
        <Popover>
          <PopoverTrigger
            type="button"
            aria-label={`Pomoc: ${title}`}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-bus/40 aria-expanded:text-foreground md:hidden"
          >
            <CircleHelp className="size-3.5" aria-hidden />
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={6}
            className="w-[min(18rem,calc(100vw-2rem))] gap-1 p-3"
          >
            <PopoverHeader>
              <PopoverTitle className="text-xs font-semibold">
                {title}
              </PopoverTitle>
              <PopoverDescription className="text-xs leading-snug">
                {description}
              </PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </div>
      <p className="hidden text-sm leading-relaxed text-muted-foreground md:block">
        {description}
      </p>
    </div>
  );
}

export function LessonTimeInput({
  id,
  label,
  value,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase md:sr-only"
      >
        {label}
      </Label>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full bg-background tabular-nums md:h-10"
      />
    </div>
  );
}
