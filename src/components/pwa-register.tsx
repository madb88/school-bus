"use client";

import { useEffect } from "react";
import { hasOfflineEntitlement } from "@/lib/offline/entitlement";
import { warmOfflineShell } from "@/lib/offline/warm-shell";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        // Full document warm only for Plan Plus; SW install already caches /offline.html + icons.
        void navigator.serviceWorker.ready.then(() => {
          if (hasOfflineEntitlement()) {
            warmOfflineShell();
          }
        });
      })
      .catch(() => {
        // Registration can fail in private mode or unsupported browsers.
      });
  }, []);

  return null;
}
