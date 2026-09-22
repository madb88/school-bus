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

export function FeedbackFab() {
  const [open, setOpen] = useState(false);
  const [formInstance, setFormInstance] = useState(0);

  return (
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
          <Button
            type="button"
            size="lg"
            className="fixed right-4 bottom-4 z-40 shadow-md max-sm:size-11 max-sm:gap-0 sm:right-6 sm:bottom-6 sm:gap-2"
            aria-label="Wyślij opinię"
          />
        }
      >
        <MessageSquare aria-hidden className="size-4" />
        <span className="hidden sm:inline">Opinia</span>
      </SheetTrigger>
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
          onSuccess={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
