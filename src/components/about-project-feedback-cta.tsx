"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { FeedbackForm } from "@/components/feedback-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** CTA that opens the same feedback sheet as the floating Opinia button. */
export function AboutProjectFeedbackCta() {
  const [open, setOpen] = useState(false);
  const [formInstance, setFormInstance] = useState(0);

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 px-5 py-6 text-center sm:px-8 sm:py-7">
      <h2 className="font-display text-xl font-semibold tracking-tight text-asphalt sm:text-2xl">
        Masz pomysł, czego brakuje?
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        To narzędzie ma być przede wszystkim przydatne rodzicom. Jeśli masz
        pomysł na funkcję albo widzisz coś, co można zrobić lepiej — chętnie go
        poznam.
      </p>
      <div className="mt-5">
        <Sheet
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              setFormInstance((n) => n + 1);
            }
          }}
        >
          <SheetTrigger
            render={
              <Button type="button" size="lg" className="gap-2" />
            }
          >
            <MessageSquare aria-hidden className="size-4" />
            Podziel się pomysłem
          </SheetTrigger>
          <SheetContent
            side="right"
            className="gap-0 overflow-y-auto sm:max-w-md"
          >
            <SheetHeader>
              <SheetTitle>Podziel się pomysłem</SheetTitle>
              <SheetDescription>
                Napisz, czego brakuje albo co można usprawnić — wiadomość trafi
                do autora aplikacji.
              </SheetDescription>
            </SheetHeader>
            <FeedbackForm
              key={formInstance}
              onSuccess={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}
