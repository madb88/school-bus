"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { NAV_ITEMS, type NavId } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MobileNavProps = {
  current: NavId;
};

export function MobileNav({ current }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0 border-border/80 bg-card/70 backdrop-blur-sm md:hidden"
            aria-label="Otwórz menu"
          />
        }
      >
        <Menu aria-hidden className="size-4" />
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Nawigacja</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 pb-6" aria-label="Główne">
          {NAV_ITEMS.map((item) => {
            const active = current === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 text-base font-medium transition-colors",
                  active
                    ? "bg-bus text-bus-foreground"
                    : "text-muted-foreground hover:bg-bus/10 hover:text-bus-deep",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
