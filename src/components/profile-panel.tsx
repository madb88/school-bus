"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CircleCheck,
  CircleUser,
  Clock,
  CreditCard,
  Crown,
  Heart,
  HelpCircle,
  Info,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Star,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FeedbackForm } from "@/components/feedback-form";
import { NotificationsPanel } from "@/components/notifications-panel";
import { PlusComplaint } from "@/components/plus-complaint";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { BackendRole } from "@/lib/auth/backend";
import {
  getProfileMenuSection,
  setProfileMenuSection,
  subscribeProfileMenuSection,
} from "@/lib/auth/profile-menu-section";
import {
  hasPlusAccessFromPanel,
  hasPushPlusAccessFromPanel,
  isPastTrialWindow,
} from "@/lib/billing/access";
import { isAllowedCheckoutUrl } from "@/lib/billing/checkout-url";
import { PLUS_PRICE_LABEL } from "@/lib/billing/constants";
import { formatRemainingMonthsLabel } from "@/lib/billing/format";
import type { PlusPanelState } from "@/lib/billing/status";
import {
  clearOfflinePlusSession,
  clearUserLocalSettings,
} from "@/lib/offline/clear-session";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import { cn } from "cn";

type Section = "profil" | "plus" | "powiadomienia" | "logout";

const PANEL_CARD =
  "rounded-2xl border border-border/35 bg-card px-6 py-7 shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_3%,transparent),0_8px_24px_color-mix(in_srgb,var(--bus)_5%,transparent)] sm:px-8 sm:py-8";

const ICON_WELL =
  "inline-grid size-11 shrink-0 place-items-center rounded-full";

const YELLOW_CTA =
  "h-11 gap-2 rounded-full border-transparent bg-amber-400 px-6 font-semibold text-asphalt shadow-none hover:bg-amber-400/90 dark:bg-amber-400 dark:text-asphalt dark:hover:bg-amber-400/90";

const BLUE_CTA = "h-11 gap-2 rounded-full px-6 font-semibold";

function openingSection(
  focusNotifications: boolean,
  focusPlus: boolean,
): Section {
  if (focusNotifications) return "powiadomienia";
  if (focusPlus) return "plus";
  return "profil";
}

async function readError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ProfilePanel({
  userId,
  email,
  role,
  createdAt,
  plus,
  plans,
  focusPlus,
  focusNotifications,
  sectionHint,
  pushUiEnabled,
}: {
  userId: string;
  email: string;
  role: BackendRole;
  createdAt: string;
  plus: PlusPanelState;
  plans: AccountPlan[];
  focusPlus: boolean;
  focusNotifications: boolean;
  /** Deep-link from `?plus=1` / `?powiadomienia=1` — updates on same-route soft nav. */
  sectionHint: Exclude<Section, "logout"> | null;
  pushUiEnabled: boolean;
}) {
  const router = useRouter();
  const [section, setSection] = useState<Section>(() =>
    openingSection(focusNotifications, focusPlus),
  );
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [seenHint, setSeenHint] = useState(sectionHint);

  // Soft-nav deep links (`?plus=1` / `?powiadomienia=1`) update props without remount —
  // adjust section during render instead of setState-in-effect.
  if (sectionHint !== seenHint) {
    setSeenHint(sectionHint);
    if (sectionHint) {
      setSection(sectionHint);
      setError(null);
    }
  }

  useEffect(() => {
    if (!sectionHint) return;
    router.replace("/profil", { scroll: false });
  }, [sectionHint, router]);

  useEffect(() => {
    // Logout is not a menu section — write null so the store sync effect
    // below does not snap the UI back to "profil".
    setProfileMenuSection(section === "logout" ? null : section);
    return () => setProfileMenuSection(null);
  }, [section]);

  // Menu can request "profil" while URL is already /profil (query cleared after
  // deep-link) — soft nav is a no-op, so apply the store request here.
  useEffect(() => {
    return subscribeProfileMenuSection(() => {
      const requested = getProfileMenuSection();
      if (requested == null) return;
      setSection((prev) => (prev === requested ? prev : requested));
      setError(null);
    });
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
        setError(
          data?.error ?? "Nie udało się rozpocząć płatności. Spróbuj później.",
        );
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
        setError(
          await readError(
            response,
            "Nie udało się wylogować. Spróbuj ponownie.",
          ),
        );
        return;
      }
      await clearOfflinePlusSession();
      clearUserLocalSettings();
      toast.success("Wylogowano");
      router.push("/login");
      router.refresh();
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-border/45 bg-card px-3 py-4 shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_3%,transparent),0_12px_32px_color-mix(in_srgb,var(--bus)_6%,transparent)] sm:p-8 lg:p-9 dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]">
      {section !== "logout" ? (
        <div className="sticky top-0 z-10 -mx-3 mb-4 border-b border-border/40 bg-card/95 px-3 py-2.5 backdrop-blur-sm sm:hidden">
          <AccountMobileTabs section={section} onSelect={selectSection} />
        </div>
      ) : null}

      <div className="flex flex-col gap-8 sm:flex-row sm:gap-8 lg:gap-12">
        <div className="hidden sm:block sm:w-44 sm:shrink-0 lg:w-48">
          <AccountSidebar section={section} onSelect={selectSection} />
        </div>

        <div className="min-w-0 flex-1 space-y-6 sm:border-l sm:border-border/40 sm:pl-8 lg:space-y-7 lg:pl-10">
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

          {section === "profil" ? (
            <ProfileSection
              email={email}
              onRequestLogout={() => selectSection("logout")}
            />
          ) : null}

          {section === "plus" ? (
            <PlusSection
              email={email}
              plus={plus}
              trialEnded={
                !hasPlusAccessFromPanel(role, plus) &&
                isPastTrialWindow(createdAt)
              }
              error={error}
              buying={buying}
              onBuy={() => void buy()}
              onRefresh={() => router.refresh()}
            />
          ) : null}
          {section === "powiadomienia" ? (
            <NotificationsSection
              userId={userId}
              plusAccess={hasPushPlusAccessFromPanel(role, plus)}
              pushUiEnabled={pushUiEnabled}
              accountPlans={plans}
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

const ACCOUNT_TABS: {
  id: Exclude<Section, "logout">;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { id: "profil", label: "Profil", shortLabel: "Profil", icon: CircleUser },
  { id: "plus", label: "Pakiet Plus", shortLabel: "Plus", icon: Crown },
  {
    id: "powiadomienia",
    label: "Powiadomienia",
    shortLabel: "Powiadomienia",
    icon: Bell,
  },
];

function AccountSidebar({
  section,
  onSelect,
}: {
  section: Section;
  onSelect: (section: Section) => void;
}) {
  return (
    <nav aria-label="Sekcje konta" className="flex flex-col gap-1.5">
      {ACCOUNT_TABS.map((tab) => (
        <MenuButton
          key={tab.id}
          label={tab.label}
          icon={tab.icon}
          selected={section === tab.id}
          onSelect={() => onSelect(tab.id)}
        />
      ))}
      <MenuButton
        label="Wyloguj"
        icon={LogOut}
        selected={section === "logout"}
        onSelect={() => onSelect("logout")}
      />
    </nav>
  );
}

function AccountMobileTabs({
  section,
  onSelect,
}: {
  section: Exclude<Section, "logout">;
  onSelect: (section: Section) => void;
}) {
  return (
    <nav
      aria-label="Sekcje konta"
      className="flex w-full flex-row items-stretch gap-1"
    >
      {ACCOUNT_TABS.map((tab) => {
        const selected = section === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            aria-label={tab.label}
            aria-current={selected ? "page" : undefined}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[0.7rem] leading-tight font-medium transition-colors",
              selected
                ? "bg-secondary font-semibold text-bus-deep dark:bg-bus/15 dark:text-bus"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "size-4 shrink-0",
                selected ? "text-bus" : "text-muted-foreground",
              )}
            />
            <span className="max-w-full hyphens-auto break-words">
              {tab.shortLabel}
            </span>
          </button>
        );
      })}
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
      variant="ghost"
      className={cn(
        "h-11 w-full justify-start gap-3 rounded-xl px-3.5 text-sm transition-colors",
        selected
          ? "bg-secondary font-semibold text-bus-deep hover:bg-secondary dark:bg-bus/15 dark:text-bus dark:hover:bg-bus/20"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      aria-current={selected ? "page" : undefined}
      onClick={onSelect}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-[1.125rem] shrink-0",
          selected ? "text-bus" : "text-muted-foreground",
        )}
      />
      {label}
    </Button>
  );
}

function ProfileSection({
  email,
  onRequestLogout,
}: {
  email: string;
  onRequestLogout: () => void;
}) {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="hidden font-display text-xl font-semibold tracking-tight text-asphalt sm:block sm:text-2xl">
          Profil
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Dane konta na tym urządzeniu.
        </p>
      </div>
      <div className="rounded-2xl bg-muted/55 px-5 py-5 sm:px-6 sm:py-6 dark:bg-muted/30">
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Zalogowany
        </p>
        <p className="mt-2.5 text-base font-semibold break-all text-asphalt sm:text-lg dark:text-foreground">
          {email}
        </p>
      </div>
      <HelpContactCard />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full gap-2 sm:hidden"
        onClick={onRequestLogout}
      >
        <LogOut aria-hidden className="size-4" />
        Wyloguj
      </Button>
    </div>
  );
}

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
  "Rozkład offline (PWA) — kopia na urządzeniu bez internetu",
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
      "Otwórz aplikację bez internetu — lokalna kopia rozkładu szkolnego, trasy MZK i planu lekcji.",
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
            powiadomienia i zapisać do pięciu planów lekcji na koncie.
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

function HelpContactCard() {
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

function PlusSection({
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

function NotificationsSection({
  userId,
  plusAccess,
  pushUiEnabled,
  accountPlans,
  onOpenPlus,
}: {
  userId: string;
  plusAccess: boolean;
  pushUiEnabled: boolean;
  accountPlans: AccountPlan[];
  onOpenPlus: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="hidden font-display text-xl font-semibold tracking-tight text-asphalt sm:block sm:text-2xl">
          Powiadomienia
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Przypomnienia o odjeździe autobusu szkolnego.
        </p>
      </div>
      {pushUiEnabled && plusAccess ? (
        <NotificationsPanel userId={userId} accountPlans={accountPlans} />
      ) : null}
      {pushUiEnabled && !plusAccess ? (
        <div className="space-y-4 rounded-2xl bg-muted/40 p-5 dark:bg-muted/20">
          <p className="text-base leading-relaxed text-foreground">
            Powiadomienia wymagają aktywnego Planu Plus.
          </p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onOpenPlus}
          >
            Zobacz Pakiet Plus
          </Button>
        </div>
      ) : null}
      {!pushUiEnabled ? (
        <p className="text-base leading-relaxed text-muted-foreground">
          Powiadomienia nie są jeszcze dostępne.
        </p>
      ) : null}
      <HelpContactCard />
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
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="font-display text-xl font-semibold tracking-tight text-asphalt sm:text-2xl">
          Wyloguj
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Ta sesja jest tylko na tym urządzeniu. Wylogowanie nie wylogowuje
          pozostałych.
        </p>
      </div>
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
        className="h-11 w-full sm:w-auto"
      >
        {pending ? "Wylogowuję…" : "Wyloguj"}
      </Button>
    </div>
  );
}
