"use client";

import { ArrowRight, HelpCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FeedbackForm } from "@/components/feedback-form";
import { ICON_WELL } from "@/components/profile/panel-styles";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "cn";

export function HelpContactCard() {
  const [open, setOpen] = useState(false);
  const [formInstance, setFormInstance] = useState(0);

  return (
    <section className="rounded-2xl border border-border/45 bg-muted/40 px-5 py-5 sm:px-6 sm:py-5 dark:bg-muted/20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className={cn(ICON_WELL, "bg-bus/10 text-bus")}>
            <HelpCircle aria-hidden className="size-[1.125rem]" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className="font-display text-base font-semibold tracking-tight text-asphalt sm:text-lg">
              Masz pytania?
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Sprawdź{" "}
              <Link
                href="/o-aplikacji"
                className="font-medium text-bus underline-offset-2 hover:underline"
              >
                jak zacząć
              </Link>{" "}
              lub skontaktuj się z nami.
            </p>
          </div>
        </div>

        <Sheet
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setFormInstance((n) => n + 1);
          }}
        >
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full shrink-0 gap-2 rounded-xl bg-card px-4 sm:w-auto"
              />
            }
          >
            <MessageSquare aria-hidden className="size-4" />
            Pomoc i kontakt
            <ArrowRight aria-hidden className="size-4" />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="gap-0 overflow-y-auto sm:max-w-md"
          >
            <SheetHeader>
              <SheetTitle>Pomoc i kontakt</SheetTitle>
              <SheetDescription>
                Napisz, w czym możemy pomóc — wiadomość trafi do autora
                aplikacji.
              </SheetDescription>
            </SheetHeader>
            <FeedbackForm key={formInstance} onSuccess={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}
