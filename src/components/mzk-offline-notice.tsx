"use client";

import { ScheduleStatusBanner } from "@/components/schedule-status-banner";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import type { FreshnessInfo } from "@/lib/schedule-freshness";

const OFFLINE_ROUTE_EDIT: FreshnessInfo = {
  level: "offline",
  message:
    "Brak połączenia z internetem — zmiana trasy MZK wymaga sieci. Zapisana trasa działa na rozkładzie offline (Plan Plus).",
  messageCompact: "Offline — zmiana trasy MZK wymaga internetu",
  detail:
    "Odjazdy dla już ustawionej trasy są dostępne na stronie rozkładu z lokalnej kopii.",
};

type MzkOfflineNoticeProps = {
  items: FreshnessInfo[];
};

export function MzkOfflineNotice({ items }: MzkOfflineNoticeProps) {
  const online = useOnlineStatus();
  const merged = online ? items : [OFFLINE_ROUTE_EDIT, ...items];
  return <ScheduleStatusBanner items={merged} />;
}
