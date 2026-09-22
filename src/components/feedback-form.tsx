"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { sendFeedback, type FeedbackState } from "@/app/actions/feedback";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: FeedbackState = {
  ok: false,
  message: "",
};

export function FeedbackForm({
  onSuccess,
}: {
  onSuccess?: () => void;
} = {}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const { theme } = useTheme();
  const [state, formAction, pending] = useActionState(
    sendFeedback,
    initialState,
  );
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [seenState, setSeenState] = useState(state);

  if (state !== seenState) {
    setSeenState(state);
    if (state.ok && state.message) {
      setTurnstileToken("");
      setTurnstileKey((key) => key + 1);
      toast.success(state.message);
      onSuccess?.();
    }
  }

  return (
    <form
      action={formAction}
      className="relative flex flex-col gap-4 px-4 pb-2"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor="feedback-website">Strona</label>
        <input
          id="feedback-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="feedback-message">Twoja opinia</Label>
        <Textarea
          id="feedback-message"
          name="message"
          required
          maxLength={2000}
          rows={5}
          placeholder="Co możemy ulepszyć?"
          disabled={pending || state.ok}
          className="min-h-28 resize-y"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="feedback-email">
          E-mail zwrotny{" "}
          <span className="font-normal text-muted-foreground">
            (opcjonalnie)
          </span>
        </Label>
        <Input
          id="feedback-email"
          name="email"
          type="email"
          maxLength={254}
          autoComplete="email"
          placeholder="jan@example.com"
          disabled={pending || state.ok}
        />
      </div>

      {!state.ok ? (
        <>
          <input
            type="hidden"
            name="cf-turnstile-response"
            value={turnstileToken}
          />

          {siteKey ? (
            <Turnstile
              key={`${turnstileKey}-${theme}`}
              siteKey={siteKey}
              options={{ size: "flexible", theme }}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Brak klucza Turnstile — formularz nie wyśle wiadomości do czasu
              konfiguracji.
            </p>
          )}
        </>
      ) : null}

      {state.message ? (
        <p
          role="status"
          aria-live="polite"
          className={
            state.ok ? "text-sm text-foreground" : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      {!state.ok ? (
        <Button
          type="submit"
          disabled={pending || !turnstileToken}
          className="w-full"
        >
          {pending ? "Wysyłanie…" : "Wyślij opinię"}
        </Button>
      ) : null}
    </form>
  );
}
