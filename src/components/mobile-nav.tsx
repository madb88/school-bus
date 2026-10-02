"use client";

import Link from "next/link";
import { Menu, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { FeedbackForm } from "@/components/feedback-form";
import { NAV_ITEMS, type NavId } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MobileNavProps = {
  current?: NavId;
};

export function MobileNav({ current }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [formInstance, setFormInstance] = useState(0);

  return (
    <>
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
          <nav className="flex flex-col gap-1 px-4 pb-4" aria-label="Główne">
            {NAV_ITEMS.map((item) => {
              const active = current === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                    active
                      ? "bg-bus text-bus-foreground"
                      : "text-muted-foreground hover:bg-bus/10 hover:text-bus-deep",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border/60 px-4 py-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                setOpen(false);
                setFeedbackOpen(true);
              }}
            >
              <MessageSquare aria-hidden className="size-4 shrink-0" />
              Wyślij opinię
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={feedbackOpen}
        onOpenChange={(next) => {
          setFeedbackOpen(next);
          if (next) {
            setFormInstance((n) => n + 1);
          }
        }}
      >
        <SheetContent
          side="right"
          className="gap-0 overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>Podziel się opinią</SheetTitle>
            <SheetDescription>
              Masz pomysł na usprawnienie? Napisz — wiadomość trafi do autora
              aplikacji.
            </SheetDescription>
          </SheetHeader>
          <FeedbackForm
            key={formInstance}
            onSuccess={() => setFeedbackOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
