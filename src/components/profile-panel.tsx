"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDownIcon,
  CircleCheck,
  CircleUser,
  CreditCard,
  Crown,
  Info,
  LogOut,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InstallNotifications } from "@/components/install-notifications";
import { PlusComplaint } from "@/components/plus-complaint";
import { Button } from "@/components/ui/button";
import { isAllowedCheckoutUrl } from "@/lib/billing/checkout-url";
import { PLUS_PRICE_LABEL } from "@/lib/billing/constants";
import { formatRemainingMonthsLabel } from "@/lib/billing/school-year";
import type { PlusPanelState } from "@/lib/billing/status";
import { cn } from "cn";

type Section = "profil" | "plus" | "powiadomienia" | "logout";

function openingSection(focusNotifications: boolean, focusPlus: boolean): Section {
  if (focusNotifications) return "powiadomienia";
  if (focusPlus) return "plus";
  return "profil";
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function ProfilePanel({
  email,
  plus,
  focusPlus,
  focusNotifications,
  pushUiEnabled,
}: {
  email: string;
  plus: PlusPanelState;
  focusPlus: boolean;
  focusNotifications: boolean;
  pushUiEnabled: boolean;
}) {
  const router = useRouter();
  const [section, setSection] = useState<Section>(() =>
    openingSection(focusNotifications, focusPlus),
  );
  const plusOpen = section === "plus" || section === "powiadomienia";
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("plus") && !url.searchParams.has("powiadomienia")) return;
    url.searchParams.delete("plus");
    url.searchParams.delete("powiadomienia");
    const next = url.search ? `${url.pathname}${url.search}` : url.pathname;
    window.history.replaceState(null, "", next);
  }, []);

  useEffect(() => {
    if (plus.state !== "pending") return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attempts >= 10) {
        window.clearInterval(timer);
        return;
      }
      router.refresh();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [plus.state, router]);

  function selectSection(next: Section) {
    setSection(next);
    setError(null);
  }

  async function buy() {
    setBuying(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.url || !isAllowedCheckoutUrl(data.url)) {
        setError(data?.error ?? "Nie udało się rozpocząć płatności. Spróbuj później.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setBuying(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError(await readError(response, "Nie udało się wylogować. Spróbuj ponownie."));
        return;
      }
      toast.success("Wylogowano");
      router.push("/login");
      router.refresh();
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setLoggingOut(false);
    }
  }

  const nav = (
    <AccountNav
      section={section}
      plusOpen={plusOpen}
      onSelect={selectSection}
    />
  );

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-border/70 bg-card/90 p-5 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:p-6 dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="hidden sm:block sm:w-52 sm:shrink-0">{nav}</div>

        <div className="min-w-0 flex-1 space-y-6 sm:border-l sm:border-border/70 sm:pl-8">
          {section === "profil" || plusOpen ? (
            <div className="sm:hidden">{nav}</div>
          ) : null}

          {section === "logout" ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:hidden"
              onClick={() => selectSection("profil")}
            >
              <ArrowLeft aria-hidden className="size-4" />
              Profil
            </button>
          ) : null}

          {section === "profil" ? <ProfileSection email={email} /> : null}

          {section === "plus" ? (
            <PlusSection
              email={email}
              plus={plus}
              error={error}
              buying={buying}
              onBuy={() => void buy()}
              onRefresh={() => router.refresh()}
            />
          ) : null}
          {section === "powiadomienia" ? (
            <NotificationsSection
              plusActive={plus.state === "active"}
              pushUiEnabled={pushUiEnabled}
              onOpenPlus={() => selectSection("plus")}
            />
          ) : null}
          {section === "logout" ? (
            <LogoutSection
              error={error}
              pending={loggingOut}
              onLogout={() => void logout()}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AccountNav({
  section,
  plusOpen,
  onSelect,
}: {
  section: Section;
  plusOpen: boolean;
  onSelect: (section: Section) => void;
}) {
  const plusSelected = section === "plus";

  return (
    <nav aria-label="Sekcje konta" className="flex flex-col gap-1">
      <MenuButton
        label="Profil"
        icon={CircleUser}
        selected={section === "profil"}
        onSelect={() => onSelect("profil")}
      />
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant={plusSelected ? "secondary" : "ghost"}
          className={cn(
            "h-11 w-full justify-between px-3",
            plusSelected && "font-medium",
          )}
          aria-expanded={plusOpen}
          aria-controls="profil-plus-pozycje"
          aria-current={plusSelected ? "page" : undefined}
          onClick={() => onSelect("plus")}
        >
          <span className="inline-flex items-center gap-2">
            <Crown
              aria-hidden
              className={cn(
                "size-4",
                plusSelected || plusOpen ? "text-bus" : "text-muted-foreground",
              )}
            />
            Pakiet Plus
          </span>
          <ChevronDownIcon
            aria-hidden
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              plusOpen && "rotate-180",
            )}
          />
        </Button>
        <div
          id="profil-plus-pozycje"
          className={cn(
            "ml-3 border-l border-border/70 pl-2",
            plusOpen ? "flex flex-col gap-1" : "hidden",
          )}
        >
          <MenuButton
            label="Powiadomienia"
            icon={Bell}
            selected={section === "powiadomienia"}
            onSelect={() => onSelect("powiadomienia")}
          />
        </div>
      </div>
      <MenuButton
        label="Wyloguj"
        icon={LogOut}
        selected={section === "logout"}
        onSelect={() => onSelect("logout")}
      />
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
      variant={selected ? "secondary" : "ghost"}
      className={cn("h-11 w-full justify-start gap-2 px-3", selected && "font-medium")}
      aria-current={selected ? "page" : undefined}
      onClick={onSelect}
    >
      <Icon
        aria-hidden
        className={cn("size-4", selected ? "text-foreground" : "text-muted-foreground")}
      />
      {label}
    </Button>
  );
}

function ProfileSection({ email }: { email: string }) {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-xl font-semibold text-asphalt sm:text-2xl">
        Profil
      </h2>
      <p className="text-sm text-muted-foreground">Zalogowany</p>
      <p className="text-base break-all text-foreground">{email}</p>
    </div>
  );
}

function buyLabel(buying: boolean): string {
  if (buying) return "Przekierowuję…";
  return `Kup Plan Plus (${PLUS_PRICE_LABEL})`;
}

function PlusBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-bus/20 bg-bus/10 px-2.5 py-1 text-xs font-semibold text-bus-deep">
      <Crown aria-hidden className="size-3.5 text-bus" />
      Pakiet Plus
    </span>
  );
}

function ActivePlanBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      <CircleCheck aria-hidden className="size-3.5" />
      Aktywny plan
    </span>
  );
}

function PriceCard() {
  return (
    <div className="rounded-xl border border-bus/20 bg-bus/5 p-5 shadow-sm sm:p-6 dark:bg-bus/10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="font-display text-4xl font-bold tracking-tight text-bus sm:text-5xl">
              {PLUS_PRICE_LABEL}
            </span>
            <span className="text-base font-medium text-muted-foreground">/ rok</span>
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">Płatność jednorazowa</p>
        </div>

        <div className="hidden h-16 w-px shrink-0 bg-bus/15 sm:block" aria-hidden />
        <div className="border-t border-bus/15 pt-5 sm:hidden" aria-hidden />

        <ul className="flex min-w-0 flex-col gap-4 sm:max-w-[14rem]">
          <li className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CalendarDays aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">Roczny dostęp</span>
              <span className="block text-sm text-muted-foreground">
                {PLUS_PRICE_LABEL} za 12 miesięcy
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400">
              <CreditCard aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                Bezpieczna płatność
              </span>
              <span className="block text-sm text-muted-foreground">Obsługuje Stripe</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ActivePlanCard({
  validUntilLabel,
  remainingLabel,
}: {
  validUntilLabel: string;
  remainingLabel: string | null;
}) {
  return (
    <div className="rounded-xl border border-bus/20 bg-gradient-to-br from-bus/5 to-emerald-500/5 p-5 shadow-sm sm:p-6 dark:from-bus/10 dark:to-emerald-500/10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch sm:gap-8">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <CalendarDays aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Ważny do</p>
            <p className="mt-0.5 font-display text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
              {validUntilLabel}
            </p>
            {remainingLabel ? (
              <p className="mt-1 text-sm text-muted-foreground">Pozostało {remainingLabel}</p>
            ) : null}
          </div>
        </div>

        <div className="hidden w-px shrink-0 self-stretch bg-bus/15 sm:block" aria-hidden />
        <div className="border-t border-bus/15 sm:hidden" aria-hidden />

        <ul className="flex min-w-0 flex-1 flex-col gap-4">
          <li className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400">
              <CreditCard aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                Płatność jednorazowa
              </span>
              <span className="block text-sm text-muted-foreground">
                {PLUS_PRICE_LABEL} za 12 miesięcy
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bus/10 text-bus dark:text-bus-deep">
              <ShieldCheck aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">Obsługuje Stripe</span>
              <span className="block text-sm text-muted-foreground">Bezpieczne płatności</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ActivePlusView({
  email,
  validUntil,
  validUntilLabel,
}: {
  email: string;
  validUntil: string;
  validUntilLabel: string;
}) {
  const remainingLabel = formatRemainingMonthsLabel(validUntil);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-3">
        <PlusBadge />
        <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
          Pakiet Plus
        </h2>
        <ActivePlanBadge />
        <p className="text-base leading-relaxed text-muted-foreground">
          Twój Plan Plus jest aktywny do {validUntilLabel}.
        </p>
      </div>

      <ActivePlanCard
        validUntilLabel={validUntilLabel}
        remainingLabel={remainingLabel}
      />

      <div className="border-t border-border/70 pt-5 sm:pt-6">
        <h3 className="font-display text-lg font-semibold text-asphalt">Zarządzaj planem</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Masz aktywny Plan Plus. Plan nie odnawia się automatycznie — po wygaśnięciu możesz
          kupić kolejny plan na tym ekranie.
        </p>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-bus/20 bg-bus/5 p-4 dark:bg-bus/10">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bus/10 text-bus">
            <Info aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">Plan odnowisz po wygaśnięciu</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Obecnie korzystasz z aktywnego Planu Plus. Możesz wrócić do tego ekranu, aby kupić
              kolejny plan, gdy obecny plan wygaśnie.
            </p>
          </div>
        </div>
      </div>

      <PlusComplaint email={email} />
    </div>
  );
}

function PlusSection({
  email,
  plus,
  error,
  buying,
  onBuy,
  onRefresh,
}: {
  email: string;
  plus: PlusPanelState;
  error: string | null;
  buying: boolean;
  onBuy: () => void;
  onRefresh: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

  if (plus.state === "active") {
    return (
      <ActivePlusView
        email={email}
        validUntil={plus.validUntil}
        validUntilLabel={plus.validUntilLabel}
      />
    );
  }

  const showBuy = plus.state === "inactive";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-3">
        <PlusBadge />
        <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
          Pakiet Plus
        </h2>
        <p
          className={cn(
            "text-base leading-relaxed",
            plus.state === "pending" || plus.state === "unknown"
              ? "text-foreground"
              : "text-muted-foreground",
          )}
          role={plus.state === "pending" || plus.state === "unknown" ? "status" : undefined}
          aria-live={plus.state === "pending" ? "polite" : undefined}
        >
          {plus.state === "pending"
            ? "Płatność w toku. Czekamy na potwierdzenie od Stripe. To jeszcze nie oznacza braku Planu Plus."
            : plus.state === "unknown"
              ? "Nie udało się sprawdzić Planu Plus. Odśwież stronę."
              : "Brak Planu Plus."}
        </p>
      </div>

      {showBuy ? <PriceCard /> : null}

      {showBuy ? (
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-bus/70" />
          <span>Płatność obsługuje Stripe. Po opłaceniu wrócisz na tę stronę.</span>
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {showBuy ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/60 p-4 dark:bg-muted/40">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-bus"
            checked={accepted}
            disabled={buying}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span className="text-sm leading-relaxed text-foreground">
            Chcę, aby świadczenie usługi rozpoczęło się od razu po dokonaniu płatności.
            Przyjmuję do wiadomości, że po rozpoczęciu świadczenia utracę prawo
            odstąpienia od umowy.
          </span>
        </label>
      ) : null}

      {showBuy ? (
        <Button
          type="button"
          size="lg"
          disabled={!accepted || buying}
          onClick={onBuy}
          className="h-11 w-full gap-2 shadow-sm sm:w-auto sm:min-w-[260px]"
        >
          {buyLabel(buying)}
          {!buying ? <ArrowRight aria-hidden className="size-4" /> : null}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onRefresh}
          className="h-11 w-full sm:w-auto"
        >
          Odśwież status
        </Button>
      )}
    </div>
  );
}

function NotificationsSection({
  plusActive,
  pushUiEnabled,
  onOpenPlus,
}: {
  plusActive: boolean;
  pushUiEnabled: boolean;
  onOpenPlus: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-asphalt sm:text-2xl">
        Powiadomienia
      </h2>
      {pushUiEnabled && plusActive ? <InstallNotifications /> : null}
      {pushUiEnabled && !plusActive ? (
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-foreground">
            Powiadomienia wymagają aktywnego Planu Plus.
          </p>
          <Button type="button" variant="outline" size="lg" onClick={onOpenPlus}>
            Zobacz Pakiet Plus
          </Button>
        </div>
      ) : null}
      {!pushUiEnabled ? (
        <p className="text-base leading-relaxed text-muted-foreground">
          Powiadomienia nie są jeszcze dostępne.
        </p>
      ) : null}
    </div>
  );
}

function LogoutSection({
  error,
  pending,
  onLogout,
}: {
  error: string | null;
  pending: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-asphalt sm:text-2xl">
        Wyloguj
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Ta sesja jest tylko na tym urządzeniu. Wylogowanie nie wylogowuje pozostałych.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={onLogout}
        className="w-full sm:w-auto"
      >
        {pending ? "Wylogowuję…" : "Wyloguj"}
      </Button>
    </div>
  );
}
