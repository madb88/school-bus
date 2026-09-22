import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

function SchoolBusIllustration() {
  return (
    <svg
      viewBox="0 0 640 280"
      role="img"
      aria-label="Żółty autobus szkolny na drodze"
      className="h-auto w-full max-w-3xl drop-shadow-[0_24px_40px_rgba(11,31,58,0.28)]"
    >
      <defs>
        <linearGradient id="busBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD54F" />
          <stop offset="55%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#E69500" />
        </linearGradient>
        <linearGradient id="windowGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8F4FF" />
          <stop offset="100%" stopColor="#7EB6E8" />
        </linearGradient>
      </defs>

      <ellipse cx="320" cy="248" rx="240" ry="14" fill="#0B1F3A" opacity="0.18" />

      <rect x="72" y="96" width="460" height="118" rx="28" fill="url(#busBody)" />
      <rect x="72" y="96" width="460" height="28" rx="14" fill="#0B1F3A" />
      <rect x="92" y="104" width="88" height="12" rx="6" fill="#FFB300" />

      <rect x="110" y="138" width="70" height="42" rx="8" fill="url(#windowGlass)" />
      <rect x="196" y="138" width="70" height="42" rx="8" fill="url(#windowGlass)" />
      <rect x="282" y="138" width="70" height="42" rx="8" fill="url(#windowGlass)" />
      <rect x="368" y="138" width="70" height="42" rx="8" fill="url(#windowGlass)" />
      <path
        d="M460 138h42c12 0 22 10 22 22v20c0 8-6 14-14 14h-50V138Z"
        fill="url(#windowGlass)"
      />

      <rect x="96" y="198" width="36" height="10" rx="3" fill="#0B1F3A" opacity="0.35" />
      <rect x="148" y="198" width="36" height="10" rx="3" fill="#0B1F3A" opacity="0.35" />
      <rect x="420" y="198" width="48" height="10" rx="3" fill="#0B1F3A" opacity="0.35" />

      <circle cx="168" cy="220" r="28" fill="#1A2433" />
      <circle cx="168" cy="220" r="14" fill="#C9D6E6" />
      <circle cx="456" cy="220" r="28" fill="#1A2433" />
      <circle cx="456" cy="220" r="14" fill="#C9D6E6" />

      <rect x="528" y="150" width="18" height="36" rx="4" fill="#FF6B35" />
      <rect x="58" y="150" width="18" height="36" rx="4" fill="#FF6B35" />
    </svg>
  );
}

export function SchoolBusHero() {
  return (
    <section className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,#fff4cc_0%,transparent_45%),radial-gradient(ellipse_at_85%_15%,#9ec9f0_0%,transparent_40%),linear-gradient(180deg,#cfe4f8_0%,#eef4fb_42%,#d9e5f2_100%)]"
      />
      <div
        aria-hidden
        className="animate-glow absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#ffd54f]/40 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-glow absolute right-0 top-32 h-72 w-72 rounded-full bg-[#7eb6e8]/35 blur-3xl [animation-delay:1.2s]"
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 pb-10 pt-8 sm:px-10">
        <header className="animate-rise flex items-center justify-between gap-4">
          <p className="font-display text-xl font-extrabold tracking-tight text-asphalt sm:text-2xl">
            Autobus szkolny
          </p>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
            <a href="#jak-dziala" className="transition-colors hover:text-foreground">
              Jak działa
            </a>
            <a href="#dla-rodzicow" className="transition-colors hover:text-foreground">
              Dla rodziców
            </a>
          </nav>
        </header>

        <div className="mt-10 flex flex-1 flex-col justify-center gap-10 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-end lg:gap-8">
          <div className="max-w-xl">
            <p className="animate-rise font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-asphalt sm:text-6xl lg:text-7xl">
              Autobus szkolny
            </p>
            <h1 className="animate-rise-delay mt-5 font-display text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
              Bezpieczny dojazd do szkoły, zawsze na widoku.
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Śledź autobus, postoje i przyjazdy w czasie rzeczywistym — spokój
              dla rodziców, punktualność dla szkoły.
            </p>
            <div className="animate-rise-delay-2 mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-11 rounded-xl bg-asphalt px-5 text-base text-primary-foreground hover:bg-asphalt/90"
              >
                Rozpocznij
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 rounded-xl border-asphalt/15 bg-white/50 px-5 text-base backdrop-blur-sm"
              >
                Zobacz trasę
              </Button>
            </div>
          </div>

          <div className="animate-bus relative pb-6 lg:pb-10">
            <div
              aria-hidden
              className="animate-road absolute inset-x-0 bottom-2 h-3 rounded-full bg-[repeating-linear-gradient(90deg,#1a2433_0_18px,transparent_18px_30px)] opacity-25"
            />
            <SchoolBusIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}
