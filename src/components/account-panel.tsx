"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { normalizeEmail } from "@/lib/auth/email";

type AccountPanelProps = {
  loginStatus: "invalid" | "unavailable" | null;
};

const STATUS_COPY: Record<NonNullable<AccountPanelProps["loginStatus"]>, string> = {
  invalid: "Link wygasł albo został już użyty. Poproś o nowy.",
  unavailable: "Logowanie e-mailem nie jest teraz dostępne. Spróbuj później.",
};

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    const base = data.error ?? fallback;
    if (response.status === 429) {
      const retry = response.headers.get("Retry-After");
      const sec = retry ? Number.parseInt(retry, 10) : NaN;
      if (Number.isFinite(sec) && sec > 0) {
        return `${base} Spróbuj za ${sec} s.`;
      }
    }
    return base;
  } catch {
    return fallback;
  }
}

export function AccountPanel({ loginStatus }: AccountPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(
    loginStatus ? STATUS_COPY[loginStatus] : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"send" | "code" | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("login")) return;
    url.searchParams.delete("login");
    const next = url.search ? `${url.pathname}${url.search}` : url.pathname;
    window.history.replaceState(null, "", next);
  }, []);

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setError("Podaj prawidłowy adres e-mail.");
      return;
    }

    setPending("send");
    setError(null);
    setBanner(null);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      if (!response.ok) {
        setError(await readError(response, "Nie udało się wysłać wiadomości. Spróbuj później."));
        return;
      }
      setEmail(normalized);
      setShowCode(true);
      setNotice("Sprawdź skrzynkę. Otwórz link w tej przeglądarce albo wpisz kod poniżej.");
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setPending(null);
    }
  }

  async function submitCode(nextCode: string = code) {
    if (pending !== null) return;
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setError("Podaj adres e-mail, na który przyszedł kod.");
      return;
    }
    if (nextCode.length !== 6) {
      setError("Wpisz 6-cyfrowy kod z wiadomości.");
      return;
    }

    setPending("code");
    setError(null);
    try {
      const response = await fetch("/api/auth/magic-link/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized, code: nextCode }),
      });
      if (!response.ok) {
        setError(await readError(response, "Nieprawidłowy lub wygasły kod."));
        return;
      }
      toast.success("Zalogowano");
      router.push("/profil");
      router.refresh();
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="mx-auto max-w-xl space-y-5 rounded-xl border border-border/70 bg-card/90 p-5 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]">
      {banner ? (
        <p className="text-sm text-destructive" role="alert">
          {banner}
        </p>
      ) : null}

      <form className="space-y-3" noValidate onSubmit={(event) => void sendLink(event)}>
        <div className="space-y-2">
          <Label htmlFor="login-email">E-mail</Label>
          <div className="flex flex-wrap items-stretch gap-3">
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
                setBanner(null);
              }}
              disabled={busy}
              required
              className="h-10 min-w-[12rem] flex-1"
              aria-invalid={error ? true : undefined}
            />
            <Button
              type="submit"
              size="lg"
              disabled={busy || !email.trim()}
              className="h-10 shrink-0 max-sm:w-full"
            >
              {pending === "send" ? "Wysyłam…" : "Wyślij link"}
            </Button>
          </div>
        </div>
        {error && !showCode ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {notice ? (
        <p className="text-sm leading-relaxed text-foreground" role="status">
          {notice}
        </p>
      ) : null}

      {showCode ? (
        <form
          className="space-y-3"
          noValidate
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void submitCode();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="login-code">Kod z wiadomości</Label>
            <div className="flex flex-wrap items-center gap-3">
              <InputOTP
                id="login-code"
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setError(null);
                  if (value.length === 6) void submitCode(value);
                }}
                disabled={busy}
                autoFocus
                aria-invalid={error ? true : undefined}
                containerClassName="shrink-0"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} aria-invalid={error ? true : undefined} />
                  <InputOTPSlot index={1} aria-invalid={error ? true : undefined} />
                  <InputOTPSlot index={2} aria-invalid={error ? true : undefined} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} aria-invalid={error ? true : undefined} />
                  <InputOTPSlot index={4} aria-invalid={error ? true : undefined} />
                  <InputOTPSlot index={5} aria-invalid={error ? true : undefined} />
                </InputOTPGroup>
              </InputOTP>
              <Button
                type="submit"
                size="lg"
                disabled={busy || code.length !== 6}
                className="h-10 shrink-0 max-sm:w-full"
              >
                {pending === "code" ? "Loguję…" : "Zaloguj kodem"}
              </Button>
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wpisz kod tutaj, w aplikacji z ekranu głównego na tym urządzeniu.
            Link z maila otwiera przeglądarkę, a to osobne logowanie.
          </p>
        </form>
      ) : (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => setShowCode(true)}
        >
          Mam już kod
        </Button>
      )}
    </div>
  );
}
