"use client";

import { useEffect, useState } from "react";
import { siteName } from "@/lib/site-metadata";

const FADE_MS = 280;

/**
 * First-paint branded splash for PWA / cold start.
 * SSR'd into the initial HTML with critical inline CSS, then fades out after hydration.
 */
export function AppSplash() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Let the first frame paint the splash, then start the exit.
    const frame = requestAnimationFrame(() => {
      if (reduceMotion) {
        setRemoved(true);
        return;
      }
      setHidden(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hidden) return;
    const timer = window.setTimeout(() => setRemoved(true), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  if (removed) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
#app-splash{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;background:#0c1420;color:#f2f6fb;opacity:1;transition:opacity ${FADE_MS}ms ease;pointer-events:none}
#app-splash[data-hidden]{opacity:0}
#app-splash .app-splash__logo{width:5rem;height:5rem;border-radius:1rem}
#app-splash .app-splash__title{margin:0;font-family:var(--font-display),ui-sans-serif,system-ui,sans-serif;font-size:1.125rem;font-weight:600;letter-spacing:-.02em;text-align:center}
#app-splash .app-splash__caption{margin:0;font-size:.75rem;color:#8b9bb0}
#app-splash .app-splash__spinner{width:1.5rem;height:1.5rem;margin-top:.25rem;border:2px solid rgba(240,120,32,.25);border-top-color:#f07820;border-radius:9999px;animation:app-splash-spin .7s linear infinite}
@keyframes app-splash-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){#app-splash{transition:none}#app-splash .app-splash__spinner{animation:none}}
@media print{#app-splash{display:none!important}}
`,
        }}
      />
      <div
        id="app-splash"
        data-hidden={hidden ? "" : undefined}
        role="status"
        aria-live="polite"
        aria-busy={!hidden}
        aria-label="Ładowanie aplikacji"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- splash must paint before next/image JS */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={80}
          height={80}
          className="app-splash__logo"
          decoding="async"
        />
        <p className="app-splash__title">{siteName}</p>
        <div className="app-splash__spinner" aria-hidden />
        <p className="app-splash__caption">Ładowanie…</p>
      </div>
    </>
  );
}
