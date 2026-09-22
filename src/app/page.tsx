import { SchoolBusHero } from "@/components/school-bus-hero";

export default function Home() {
  return (
    <main className="flex-1">
      <SchoolBusHero />

      <section
        id="jak-dziala"
        className="border-t border-border/60 bg-[linear-gradient(180deg,#f7fafc_0%,#eef4fb_100%)] px-6 py-20 sm:px-10"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
            Jak działa
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            School Bus łączy kierowcę, szkołę i rodziców w jednej jasnej trasie.
            Widzisz aktualne położenie autobusu, planowane postoje oraz
            potwierdzenie, że dziecko wsiadło i wysiadło bezpiecznie.
          </p>
        </div>
      </section>

      <section
        id="dla-rodzicow"
        className="border-t border-border/60 bg-asphalt px-6 py-20 text-primary-foreground sm:px-10"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Dla rodziców
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-sky-mist/90">
            Dostajesz powiadomienia o odjeździe, opóźnieniu i przyjeździe pod
            szkołę. Bez dzwonienia do kierowcy — wszystko w aplikacji School
            Bus.
          </p>
        </div>
      </section>
    </main>
  );
}
