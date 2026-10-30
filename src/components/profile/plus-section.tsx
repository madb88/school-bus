"use client";

import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CircleCheck,
  Clock,
  CreditCard,
  Crown,
  Heart,
  Info,
  Settings,
  ShieldCheck,
  Star,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { HelpContactCard } from "@/components/profile/help-contact-card";
import {
  BLUE_CTA,
  ICON_WELL,
  PANEL_CARD,
  scrollToId,
  YELLOW_CTA,
} from "@/components/profile/panel-styles";
import { PlusComplaint } from "@/components/plus-complaint";
import { Button } from "@/components/ui/button";
import { PLUS_PRICE_LABEL } from "@/lib/billing/constants";
import { formatRemainingMonthsLabel } from "@/lib/billing/format";
import type { PlusPanelState } from "@/lib/billing/status";
import { cn } from "cn";

function buyLabel(buying: boolean): string {
  if (buying) return "Przekierowuję…";
  return "Wybieram Plan Plus";
}

function PlusBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground dark:bg-bus/20 dark:text-bus">
      <Crown aria-hidden className="size-3.5 text-bus" />
      Pakiet Plus
    </span>
  );
}

function ActivePlanStatus() {
  return (
    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
      <CircleCheck aria-hidden className="size-4" />
      Aktywny plan
    </p>
  );
}

function PlanStat({
  icon: Icon,
  iconClassName,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3.5">
      <span className={cn(ICON_WELL, iconClassName)}>
        <Icon aria-hidden className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-[0.95rem] font-semibold tracking-tight text-asphalt sm:text-base dark:text-foreground">
          {value}
        </p>
        <p className="text-sm leading-snug text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  iconClassName = "bg-bus/10 text-bus",
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn(ICON_WELL, iconClassName)}>
        <Icon aria-hidden className="size-5" strokeWidth={1.75} />
      </span>
      <h3 className="font-display text-lg font-semibold tracking-tight text-asphalt sm:text-xl">
        {children}
      </h3>
    </div>
  );
}

function ActivePlanHero({
  validUntilLabel,
  remainingLabel,
}: {
  validUntilLabel: string;
  remainingLabel: string | null;
}) {
  return (
    <section className={PANEL_CARD}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 space-y-3">
          <PlusBadge />
          <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-[1.75rem]">
            Twój Plan Plus
          </h2>
          <ActivePlanStatus />
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Twój Plan Plus jest aktywny do {validUntilLabel}.
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          className={cn(YELLOW_CTA, "w-full shrink-0 sm:mt-1 sm:w-auto")}
          onClick={() => scrollToId("zarzadzaj-planem")}
        >
          Zarządzaj planem
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="mt-8 grid gap-6 border-t border-border/35 pt-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border/35">
        <div className="md:pr-8">
          <PlanStat
            icon={CalendarDays}
            iconClassName="bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            label="Ważny do"
            value={validUntilLabel}
            hint={
              remainingLabel ? `Pozostało ${remainingLabel}` : "Aktywny plan"
            }
          />
        </div>
        <div className="border-t border-border/35 pt-6 md:border-t-0 md:px-8 md:pt-0">
          <PlanStat
            icon={CreditCard}
            iconClassName="bg-violet-500/12 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
            label="Płatność"
            value="Jednorazowa"
            hint={`${PLUS_PRICE_LABEL} za rok szkolny`}
          />
        </div>
        <div className="border-t border-border/35 pt-6 md:border-t-0 md:pl-8 md:pt-0">
          <PlanStat
            icon={ShieldCheck}
            iconClassName="bg-bus/10 text-bus dark:bg-bus/15"
            label="Płatności"
            value="Obsługuje Stripe"
            hint="Bezpieczne i szybkie płatności"
          />
        </div>
      </div>
    </section>
  );
}

const PLUS_FEATURE_LABELS = [
  "Powiadomienia o zmianach w kursach",
  "Do 5 planów lekcji na koncie, na każdym urządzeniu",
  "Rozkład offline — spersonalizowany rozkład jazdy bez internetu",
] as const;

const PLUS_COMING_SOON = [
  {
    icon: Heart,
    title: "Ulubione przejazdy",
  },
] as const;

function PlusIncludesCard() {
  return (
    <section className={PANEL_CARD}>
      <SectionHeading
        icon={Crown}
        iconClassName="bg-amber-400/15 text-amber-600 dark:text-amber-400"
      >
        Twój Plan Plus obejmuje:
      </SectionHeading>
      <ul className="mt-6 grid gap-3.5 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-4">
        {PLUS_FEATURE_LABELS.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground sm:text-base"
          >
            <CircleCheck
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlusComingSoonCard() {
  return (
    <section className={PANEL_CARD}>
      <SectionHeading
        icon={Clock}
        iconClassName="bg-muted text-muted-foreground"
      >
        Wkrótce
      </SectionHeading>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {PLUS_COMING_SOON.map(({ icon: Icon, title }) => (
          <li key={title} className="flex items-start gap-3">
            <span
              className={cn(
                ICON_WELL,
                "size-10 bg-muted/80 text-muted-foreground",
              )}
            >
              <Icon
                aria-hidden
                className="size-[1.125rem]"
                strokeWidth={1.75}
              />
            </span>
            <span className="pt-2 text-sm font-medium leading-snug text-foreground sm:text-base">
              {title}
            </span>
          </li>
        ))}
      </ul>
    </section>
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
      <ActivePlanHero
        validUntilLabel={validUntilLabel}
        remainingLabel={remainingLabel}
      />

      <section
        id="zarzadzaj-planem"
        className={cn(PANEL_CARD, "scroll-mt-6 space-y-5")}
      >
        <SectionHeading icon={Settings} iconClassName="bg-bus/10 text-bus">
          Zarządzaj planem
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Masz aktywny Plan Plus. Plan nie odnawia się automatycznie — po
          wygaśnięciu możesz kupić kolejny plan na tym ekranie.
        </p>

        <div className="flex items-start gap-3.5 rounded-2xl bg-bus/6 px-4 py-4 sm:px-5 sm:py-5 dark:bg-bus/10">
          <span className={cn(ICON_WELL, "bg-bus/10 text-bus")}>
            <Info aria-hidden className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 space-y-1.5 pt-1">
            <p className="text-sm font-semibold text-foreground sm:text-base">
              Plan odnowisz po wygaśnięciu
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Obecnie korzystasz z aktywnego Planu Plus. Możesz wrócić do tego
              ekranu, aby kupić kolejny plan, gdy obecny plan wygaśnie.
            </p>
          </div>
        </div>
      </section>

      <PlusIncludesCard />

      <PlusComingSoonCard />

      <PlusComplaint email={email} />

      <HelpContactCard />
    </div>
  );
}

const PLUS_BENEFITS = [
  {
    icon: Bell,
    title: "Powiadomienia o zmianach w kursach",
    description: "Otrzymuj powiadomienia, gdy coś się zmieni w rozkładach.",
    iconClassName: "bg-bus/10 text-bus",
  },
  {
    icon: BookOpen,
    title: "Do 5 planów lekcji na koncie",
    description:
      "Zapisz do pięciu planów na koncie i korzystaj z nich na każdym urządzeniu.",
    iconClassName:
      "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  {
    icon: WifiOff,
    title: "Rozkład offline",
    description:
      "Bez internetu zobaczysz spersonalizowany rozkład jazdy dopasowany do Twojego planu lekcji (po wcześniejszym otwarciu aplikacji online).",
    iconClassName: "bg-sky-500/12 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  },
  {
    icon: Star,
    title: "Wsparcie i nowe funkcje",
    description: "Nowe funkcje rozwijamy z myślą o użytkownikach Planu Plus.",
    iconClassName: "bg-amber-400/15 text-amber-600 dark:text-amber-400",
  },
] as const;

function InactivePlusHero({
  onCta,
  trialEnded,
}: {
  onCta: () => void;
  trialEnded: boolean;
}) {
  return (
    <section className={PANEL_CARD}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0 space-y-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                ICON_WELL,
                "bg-amber-400/15 text-amber-600 dark:text-amber-400",
              )}
            >
              <Crown aria-hidden className="size-5" />
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-[1.75rem]">
              Plan Plus jest niedostępny
            </h2>
          </div>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            Korzystasz z darmowej wersji. Wykup Plan Plus, aby włączyć
            powiadomienia, zapisać do pięciu planów lekcji na koncie i mieć
            dostęp do rozkładu offline.
          </p>
          {trialEnded ? (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Plany zapisane na koncie nie znikają — wrócą po wykupieniu Planu
              Plus.
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          size="lg"
          className={cn(BLUE_CTA, "w-full shrink-0 lg:mt-1 lg:w-auto")}
          onClick={onCta}
        >
          Przejdź na Plan Plus
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      </div>
    </section>
  );
}

function TrialPlusView({
  validUntilLabel,
  remainingLabel,
  buying,
  error,
  onBuy,
}: {
  validUntilLabel: string;
  remainingLabel: string | null;
  buying: boolean;
  error: string | null;
  onBuy: () => void;
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className={PANEL_CARD}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              Okres próbny
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-[1.75rem]">
              Okres próbny Planu Plus
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              Do {validUntilLabel} masz za darmo wszystkie funkcje Planu Plus.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-border/35 pt-8">
          <PlanStat
            icon={CalendarDays}
            iconClassName="bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            label="Pozostało"
            value={remainingLabel ?? "Okres próbny"}
            hint={`Do ${validUntilLabel}`}
          />
        </div>
      </section>

      <PlusIncludesCard />

      <p className="text-sm leading-relaxed text-muted-foreground">
        Po wykupieniu Plan Plus działa do 31 sierpnia, a plany zapisane na koncie
        zostają.
      </p>

      <PriceCard buying={buying} error={error} onBuy={onBuy} />

      <PlusComingSoonCard />
      <HelpContactCard />
    </div>
  );
}

function PlusBenefitsGrid() {
  return (
    <section className={PANEL_CARD}>
      <h3 className="font-display text-lg font-semibold tracking-tight text-asphalt sm:text-xl">
        Co zyskasz z Planem Plus?
      </h3>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-7">
        {PLUS_BENEFITS.map(
          ({ icon: Icon, title, description, iconClassName }) => (
            <div key={title} className="flex items-start gap-3.5">
              <span className={cn(ICON_WELL, iconClassName)}>
                <Icon aria-hidden className="size-[1.125rem]" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-asphalt sm:text-base dark:text-foreground">
                  {title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function PriceCard({
  buying,
  error,
  onBuy,
}: {
  buying: boolean;
  error: string | null;
  onBuy: () => void;
}) {
  return (
    <section id="plan-plus-cena" className="scroll-mt-6 space-y-4">
      <h3 className="font-display text-lg font-semibold tracking-tight text-asphalt sm:text-xl">
        Wybierz plan dla siebie
      </h3>

      <div className="overflow-hidden rounded-2xl border-2 border-amber-400/55 bg-card shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_3%,transparent),0_8px_20px_color-mix(in_srgb,var(--bus)_4%,transparent)] dark:border-amber-400/40">
        <div className="grid lg:grid-cols-[1.15fr_0.95fr]">
          <div className="border-b border-border/40 px-5 py-6 sm:px-7 sm:py-7 lg:border-r lg:border-b-0">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  ICON_WELL,
                  "size-9 bg-amber-400/15 text-amber-600 dark:text-amber-400",
                )}
              >
                <Crown aria-hidden className="size-4" />
              </span>
              <p className="font-display text-base font-semibold text-asphalt sm:text-lg">
                Plan Plus
              </p>
            </div>
            <ul className="mt-5 space-y-3">
              {[
                "Powiadomienia przed odjazdem autobusu",
                "Powiadomienia przed powrotem",
                "Powiadomienia o zmianach kursu",
                "Do 5 planów lekcji na koncie, na każdym urządzeniu",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground"
                >
                  <CircleCheck
                    aria-hidden
                    className="mt-0.5 size-[1.125rem] shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center bg-amber-400/8 px-5 py-6 sm:px-7 sm:py-7 dark:bg-amber-400/8">
            <div className="flex flex-wrap items-end gap-x-2.5 gap-y-0">
              <p className="font-display text-4xl font-bold tracking-tight text-asphalt sm:text-5xl dark:text-foreground">
                {PLUS_PRICE_LABEL}
              </p>
              <p className="pb-1.5 text-sm font-medium text-muted-foreground sm:text-base">
                do 31 sierpnia
              </p>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Kwota ostateczna · płatność jednorazowa
            </p>

            <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-bus" />
              <span>
                Płatność obsługuje Stripe. Po opłaceniu wrócisz na tę stronę.
              </span>
            </p>

            {error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="button"
              size="lg"
              disabled={buying}
              onClick={onBuy}
              className={cn(BLUE_CTA, "mt-5 w-full")}
            >
              {buyLabel(buying)}
              {!buying ? <ArrowRight aria-hidden className="size-4" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PlusSection({
  email,
  plus,
  trialEnded,
  error,
  buying,
  onBuy,
  onRefresh,
}: {
  email: string;
  plus: PlusPanelState;
  trialEnded: boolean;
  error: string | null;
  buying: boolean;
  onBuy: () => void;
  onRefresh: () => void;
}) {
  if (plus.state === "active") {
    return (
      <ActivePlusView
        email={email}
        validUntil={plus.validUntil}
        validUntilLabel={plus.validUntilLabel}
      />
    );
  }

  if (plus.state === "trial") {
    return (
      <TrialPlusView
        validUntilLabel={plus.validUntilLabel}
        remainingLabel={plus.remainingLabel}
        buying={buying}
        error={error}
        onBuy={onBuy}
      />
    );
  }

  const showBuy = plus.state === "inactive";

  return (
    <div className="space-y-5 sm:space-y-6">
      {showBuy ? (
        <>
          <InactivePlusHero
            trialEnded={trialEnded}
            onCta={() => scrollToId("plan-plus-cena")}
          />
          <PlusBenefitsGrid />
          <PriceCard buying={buying} error={error} onBuy={onBuy} />
          <PlusComingSoonCard />
        </>
      ) : (
        <section className={PANEL_CARD}>
          <PlusBadge />
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
            Pakiet Plus
          </h2>
          <p
            className="mt-3 text-base leading-relaxed text-foreground"
            role="status"
            aria-live={plus.state === "pending" ? "polite" : undefined}
          >
            {plus.state === "pending"
              ? "Płatność w toku. Czekamy na potwierdzenie od Stripe. To jeszcze nie oznacza braku Planu Plus."
              : "Nie udało się sprawdzić Planu Plus. Odśwież stronę."}
          </p>
          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onRefresh}
            className="mt-6 h-11 w-full sm:w-auto"
          >
            Odśwież status
          </Button>
        </section>
      )}

      <HelpContactCard />
    </div>
  );
}
