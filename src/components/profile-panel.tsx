"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AccountMobileTabs,
  AccountSidebar,
} from "@/components/profile/account-nav";
import { LogoutSection } from "@/components/profile/logout-section";
import { NotificationsSection } from "@/components/profile/notifications-section";
import { PlusSection } from "@/components/profile/plus-section";
import { ProfileSection } from "@/components/profile/profile-section";
import type { Section } from "@/components/profile/types";
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
import type { PlusPanelState } from "@/lib/billing/status";
import {
  clearOfflinePlusSession,
  clearUserLocalSettings,
} from "@/lib/offline/clear-session";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";

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
