"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScheduleChangesContent } from "@/components/schedule-changes-content";
import type { ScheduleCorrectionSnapshot } from "@/lib/dowozy/types";
import { hasOfflineEntitlement } from "@/lib/offline/entitlement";
import { goToStaticOfflineGate } from "@/lib/offline/static-offline-gate";
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
      return;
    }
    if (!online && !entitled) {
      goToStaticOfflineGate();
    }
  }, [online, entitled, router]);

  if (!online) {
    return (
      <p className="text-sm text-muted-foreground">
        {entitled ? "Przechodzę do rozkładu offline…" : "Przekierowanie…"}
      </p>
    );
  }

  return <ScheduleChangesContent correction={correction} />;
}
