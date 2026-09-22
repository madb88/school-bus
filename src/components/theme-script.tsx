"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";
import { themeInitScript } from "@/components/theme-init";

/**
 * Injects the theme boot script via the SSR HTML stream so React 19
 * never sees a <script> during client render (avoids console error).
 */
export function ThemeScript() {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        id="school-bus-theme-init"
        dangerouslySetInnerHTML={{ __html: themeInitScript }}
      />
    );
  });

  return null;
}
