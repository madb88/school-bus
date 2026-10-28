"use client";

import Link from "next/link";
import { Menu, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { FeedbackForm } from "@/components/feedback-form";
import {
  NewsUnreadBadge,
  useUnreadNewsAriaLabel,
} from "@/components/news-unread-badge";
import {
  NAV_ITEMS,
  OFFLINE_NAV_HINT,
  type NavId,
} from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { useUnreadNewsCount } from "@/lib/use-unread-news-count";

type MobileNavProps = {
  current?: NavId;
};

export function MobileNav({ current }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [formInstance, setFormInstance] = useState(0);
  const online = useOnlineStatus();
  const unread = useUnreadNewsCount();
  const nowosciAriaLabel = useUnreadNewsAriaLabel("Nowości");
  const menuAriaLabel =
    unread > 0 ? "Otwórz menu (są nowe nowości)" : "Otwórz menu";

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative size-9 shrink-0 border-border/80 bg-card/70 backdrop-blur-sm md:hidden"
              aria-label={menuAriaLabel}
            />
          }
        >
          <Menu aria-hidden className="size-4" />
          <NewsUnreadBadge variant="dot" />
        </SheetTrigger>
        <SheetContent side="right" className="gap-0 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Nawigacja</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col px-4 pb-4">
            <nav className="flex flex-col gap-0.5" aria-label="Główne">
              {NAV_ITEMS.map((item) => {
                const active = current === item.id;
                const Icon = item.icon;
                const isNowosci = item.id === "nowosci";
                const disabled = !online && !item.offlineAvailable;
                const itemClass = cn(
                  "inline-flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors",
                  disabled
                    ? "cursor-not-allowed text-muted-foreground/45"
                    : active
                      ? "bg-bus/10 font-semibold text-bus dark:bg-bus/15 dark:text-bus"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                );

                if (disabled) {
                  return (
                    <span
                      key={item.id}
                      role="link"
                      aria-disabled="true"
                      title={OFFLINE_NAV_HINT}
                      className={itemClass}
                    >
                      <Icon aria-hidden className="size-5 shrink-0" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={itemClass}
                    aria-current={active ? "page" : undefined}
                    aria-label={isNowosci ? nowosciAriaLabel : undefined}
                  >
                    <Icon aria-hidden className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {isNowosci ? (
                      <NewsUnreadBadge position="inline" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-center gap-2 rounded-xl"
                disabled={!online}
                title={online ? undefined : OFFLINE_NAV_HINT}
                onClick={() => {
                  if (!online) return;
                  setOpen(false);
                  setFeedbackOpen(true);
                }}
              >
                <MessageSquare aria-hidden className="size-4 shrink-0" />
                Wyślij opinię
              </Button>
            </div>
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
