const CONTACT_EMAIL = "kaminskiqba@gmail.com";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-10">
        <p className="text-sm text-muted-foreground">
          © {year} Autobus szkolny
        </p>
        <p className="text-sm text-muted-foreground">
          Masz pomysł na usprawnienie? Napisz:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-foreground underline underline-offset-2 hover:text-bus-deep"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
