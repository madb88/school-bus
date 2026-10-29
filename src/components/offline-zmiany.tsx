"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OfflineNoAccessScreen } from "@/components/offline-no-access-screen";
import { ScheduleChangesContent } from "@/components/schedule-changes-content";
import type { ScheduleCorrectionSnapshot } from "@/lib/dowozy/types";
import { hasOfflineEntitlement } from "@/lib/offline/entitlement";
import { useOnlineStatus } from "@/lib/offline/use-online-status";

type OfflineZmianyProps = {
  correction: ScheduleCorrectionSnapshot | null;
};

/**
 * Online: show correction content. Offline Plus: redirect to /offline.
 * Offline free: no-access screen.
 */
export function OfflineZmiany({ correction }: OfflineZmianyProps) {
  const online = useOnlineStatus();
  const router = useRouter();
  const entitled = hasOfflineEntitlement();

  useEffect(() => {
    if (!online && entitled) {
      router.replace("/offline");
    }
  }, [online, entitled, router]);

  if (!online && entitled) {
    return (
      <p className="text-sm text-muted-foreground">Przechodzę do rozkładu offline…</p>
    );
  }

  if (!online && !entitled) {
    return <OfflineNoAccessScreen />;
  }

  return <ScheduleChangesContent correction={correction} />;
}
