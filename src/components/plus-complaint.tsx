"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { sendComplaint, type ComplaintState } from "@/app/actions/complaint";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const initialState: ComplaintState = { ok: false, message: "" };

function ComplaintForm({
  email,
  onSuccess,
}: {
  email: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(sendComplaint, initialState);

  useEffect(() => {
    if (!state.ok || !state.message) return;
    toast.success(state.message);
    onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="relative flex flex-col gap-4 px-4 pb-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor="complaint-website">Strona</label>
        <input
          id="complaint-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <p className="text-sm break-all text-muted-foreground">Konto: {email}</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="complaint-message">Opis reklamacji</Label>
        <Textarea
          id="complaint-message"
          name="message"
          required
          maxLength={2000}
          rows={5}
          placeholder="Co się stało?"
          disabled={pending || state.ok}
          className="min-h-28 resize-y"
        />
      </div>

      {state.message && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {!state.ok ? (
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Wysyłanie…" : "Wyślij reklamację"}
        </Button>
      ) : null}
    </form>
  );
}

export function PlusComplaint({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [formInstance, setFormInstance] = useState(0);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormInstance((n) => n + 1);
      }}
    >
      <SheetTrigger render={<Button type="button" variant="outline" size="lg" />}>
        Reklamacja
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Reklamacja</SheetTitle>
          <SheetDescription>
            Opisz, co poszło nie tak z Planem Plus. Wiadomość trafi do autora
            aplikacji. Odpowiedź wyślemy na adres tego konta.
          </SheetDescription>
        </SheetHeader>
        <ComplaintForm
          key={formInstance}
          email={email}
          onSuccess={close}
        />
      </SheetContent>
    </Sheet>
  );
}
