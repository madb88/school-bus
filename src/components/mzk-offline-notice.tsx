"use client";

import { OfflineConnectivityBanner } from "@/components/offline-connectivity-banner";
import { ScheduleStatusBanner } from "@/components/schedule-status-banner";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import type { FreshnessInfo } from "@/lib/schedule-freshness";

type MzkOfflineNoticeProps = {
  items: FreshnessInfo[];
};

export function MzkOfflineNotice({ items }: MzkOfflineNoticeProps) {
  const online = useOnlineStatus();

  return (
    <div className="space-y-3">
      {!online ? (
        <OfflineConnectivityBanner
          title="Brak internetu — zmiana trasy MZK wymaga sieci"
          detail="Zapisana trasa działa na rozkładzie offline (Plan Plus). Odjazdy dla niej są dostępne z lokalnej kopii."
        />
      ) : null}
      <ScheduleStatusBanner items={items} />
    </div>
  );
}
