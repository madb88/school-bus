"use client";

import {
  Bell,
  CircleUser,
  Crown,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/components/profile/types";
import { cn } from "cn";

const ACCOUNT_TABS: {
  id: Exclude<Section, "logout">;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { id: "profil", label: "Profil", shortLabel: "Profil", icon: CircleUser },
  { id: "plus", label: "Pakiet Plus", shortLabel: "Plus", icon: Crown },
  {
    id: "powiadomienia",
    label: "Powiadomienia",
    shortLabel: "Powiadomienia",
    icon: Bell,
  },
];

export function AccountSidebar({
  section,
  onSelect,
}: {
  section: Section;
  onSelect: (section: Section) => void;
}) {
  return (
    <nav aria-label="Sekcje konta" className="flex flex-col gap-1.5">
      {ACCOUNT_TABS.map((tab) => (
        <MenuButton
          key={tab.id}
          label={tab.label}
          icon={tab.icon}
          selected={section === tab.id}
          onSelect={() => onSelect(tab.id)}
        />
      ))}
      <MenuButton
        label="Wyloguj"
        icon={LogOut}
        selected={section === "logout"}
        onSelect={() => onSelect("logout")}
      />
    </nav>
  );
}

export function AccountMobileTabs({
  section,
  onSelect,
}: {
  section: Exclude<Section, "logout">;
  onSelect: (section: Section) => void;
}) {
  return (
    <nav
      aria-label="Sekcje konta"
      className="flex w-full flex-row items-stretch gap-1"
    >
      {ACCOUNT_TABS.map((tab) => {
        const selected = section === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            aria-label={tab.label}
            aria-current={selected ? "page" : undefined}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[0.7rem] leading-tight font-medium transition-colors",
              selected
                ? "bg-secondary font-semibold text-bus-deep dark:bg-bus/15 dark:text-bus"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "size-4 shrink-0",
                selected ? "text-bus" : "text-muted-foreground",
              )}
            />
            <span className="max-w-full hyphens-auto break-words">
              {tab.shortLabel}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function MenuButton({
  label,
  icon: Icon,
  selected,
  onSelect,
}: {
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-11 w-full justify-start gap-3 rounded-xl px-3.5 text-sm transition-colors",
        selected
          ? "bg-secondary font-semibold text-bus-deep hover:bg-secondary dark:bg-bus/15 dark:text-bus dark:hover:bg-bus/20"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      aria-current={selected ? "page" : undefined}
      onClick={onSelect}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-[1.125rem] shrink-0",
          selected ? "text-bus" : "text-muted-foreground",
        )}
      />
      {label}
    </Button>
  );
}
