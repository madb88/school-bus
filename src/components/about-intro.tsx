import { PageEyebrow } from "@/components/page-eyebrow";

export function AboutIntro() {
  return (
    <header className="mb-8 space-y-4 sm:mb-10">
      <PageEyebrow>Jak zacząć</PageEyebrow>
      <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl lg:text-5xl">
        5 sposobów na korzystanie z autobusszkolny.pl
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Zobacz, jak w kilku prostych krokach skonfigurować aplikację i wyciągnąć
        z niej jak najwięcej. Wybierz interesujący Cię temat i rozwiń szczegóły.
      </p>
    </header>
  );
}
