"use client";

import { useEffect } from "react";
import { markNewsSeen } from "@/lib/news-seen";

/** Marks current latest news as seen when mounted (e.g. on `/nowosci`). */
export function MarkNewsSeen() {
  useEffect(() => {
    markNewsSeen();
  }, []);

  return null;
}
