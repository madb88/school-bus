"use client";

import { LogOut } from "lucide-react";
import { HelpContactCard } from "@/components/profile/help-contact-card";
import { Button } from "@/components/ui/button";

export function ProfileSection({
  email,
  onRequestLogout,
}: {
  email: string;
  onRequestLogout: () => void;
}) {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="hidden font-display text-xl font-semibold tracking-tight text-asphalt sm:block sm:text-2xl">
          Profil
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Dane konta na tym urządzeniu.
        </p>
      </div>
      <div className="rounded-2xl bg-muted/55 px-5 py-5 sm:px-6 sm:py-6 dark:bg-muted/30">
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Zalogowany
        </p>
        <p className="mt-2.5 text-base font-semibold break-all text-asphalt sm:text-lg dark:text-foreground">
          {email}
        </p>
      </div>
      <HelpContactCard />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full gap-2 sm:hidden"
        onClick={onRequestLogout}
      >
        <LogOut aria-hidden className="size-4" />
        Wyloguj
      </Button>
    </div>
  );
}
