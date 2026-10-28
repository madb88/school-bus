"use client";

import { useEffect } from "react";
import { warmOfflineShell } from "@/lib/offline/warm-shell";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        // After SW is ready, cache shell HTML/assets for cold offline opens.
        void navigator.serviceWorker.ready.then(() => {
          warmOfflineShell();
        });
      })
      .catch(() => {
        // Registration can fail in private mode or unsupported browsers.
      });
  }, []);

  return null;
}
