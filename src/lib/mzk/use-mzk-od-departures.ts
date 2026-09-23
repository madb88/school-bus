"use client";

import { useEffect, useState } from "react";
import type { ScheduleDateFilter } from "@/lib/dowozy/filter-schedule";
import type { MzkOdDeparture } from "./types";

export type MzkOdBundle = {
  pickups: MzkOdDeparture[];
  dropoffs: MzkOdDeparture[];
};

const EMPTY: MzkOdBundle = { pickups: [], dropoffs: [] };

type UseMzkOdDeparturesArgs = {
  enabled: boolean;
  boardStopId: string | null;
  alightStopId: string | null;
  dateFilter: ScheduleDateFilter;
  route: string | null;
};

type FetchState = {
  key: string;
  data: MzkOdBundle;
  error: boolean;
};

export function useMzkOdDepartures({
  enabled,
  boardStopId,
  alightStopId,
  dateFilter,
  route,
}: UseMzkOdDeparturesArgs): {
  data: MzkOdBundle;
  loading: boolean;
  error: boolean;
} {
  const requestKey =
    enabled && boardStopId && alightStopId
      ? `${boardStopId}\0${alightStopId}\0${dateFilter}\0${route ?? ""}`
      : null;

  const [state, setState] = useState<FetchState | null>(null);

  useEffect(() => {
    if (!requestKey || !boardStopId || !alightStopId) return;

    const params = new URLSearchParams({
      board: boardStopId,
      alight: alightStopId,
      date: dateFilter,
    });
    if (route) params.set("route", route);

    const controller = new AbortController();
    const key = requestKey;

    void fetch(`/api/mzk-departures?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = (await response.json()) as MzkOdBundle;
        if (controller.signal.aborted) return;
        setState({
          key,
          data: {
            pickups: Array.isArray(json.pickups) ? json.pickups : [],
            dropoffs: Array.isArray(json.dropoffs) ? json.dropoffs : [],
          },
          error: false,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ key, data: EMPTY, error: true });
        if (process.env.NODE_ENV !== "production") {
          console.error("MZK departures fetch failed", err);
        }
      });

    return () => controller.abort();
  }, [requestKey, boardStopId, alightStopId, dateFilter, route]);

  if (!requestKey) {
    return { data: EMPTY, loading: false, error: false };
  }

  const matched = state?.key === requestKey ? state : null;

  return {
    data: matched?.data ?? EMPTY,
    loading: matched === null,
    error: matched?.error ?? false,
  };
}
