export const PANEL_CARD =
  "rounded-2xl border border-border/35 bg-card px-6 py-7 shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_3%,transparent),0_8px_24px_color-mix(in_srgb,var(--bus)_5%,transparent)] sm:px-8 sm:py-8";

export const ICON_WELL =
  "inline-grid size-11 shrink-0 place-items-center rounded-full";

export const YELLOW_CTA =
  "h-11 gap-2 rounded-full border-transparent bg-amber-400 px-6 font-semibold text-asphalt shadow-none hover:bg-amber-400/90 dark:bg-amber-400 dark:text-asphalt dark:hover:bg-amber-400/90";

export const BLUE_CTA = "h-11 gap-2 rounded-full px-6 font-semibold";

export function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
