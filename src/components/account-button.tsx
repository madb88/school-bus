"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CircleUser, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Jasny", icon: Sun },
  { value: "dark", label: "Ciemny", icon: Moon },
];

export function AccountButton({ email }: { email: string | null }) {
  const pathname = usePathname();
  const signedIn = email !== null;
  const active = signedIn ? pathname === "/profil" : pathname === "/login";

  if (!signedIn) {
    return (
      <Link
        href="/login"
        aria-label="Logowanie"
        title="Logowanie"
        aria-current={active ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-9 shrink-0 border-border/80 bg-card/70 backdrop-blur-sm",
          active && "border-transparent bg-bus text-bus-foreground hover:bg-bus/90",
        )}
      >
        <CircleUser aria-hidden className="size-4" />
      </Link>
    );
  }

  return <AccountMenu email={email} active={active} />;
}

function AccountMenu({ email, active }: { email: string; active: boolean }) {
  const router = useRouter();
  const { preference, setThemePreference } = useTheme();
  const [pending, setPending] = useState(false);

  function onThemeChange(value: string[]) {
    const next = value.at(-1);
    if (next === "system" || next === "light" || next === "dark") {
      setThemePreference(next);
    }
  }

  async function logout() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        toast.error("Nie udało się wylogować. Spróbuj ponownie.");
        return;
      }
      toast.success("Wylogowano");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Nie udało się połączyć z serwerem.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Konto"
            title="Konto"
            className={cn(
              "size-9 shrink-0 border-border/80 bg-card/70 backdrop-blur-sm",
              active && "border-transparent bg-bus text-bus-foreground hover:bg-bus/90",
            )}
          />
        }
      >
        <CircleUser aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 min-w-64">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-foreground" title={email}>
            {email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem
          href="/profil"
          closeOnClick
          className="px-2 py-1.5"
          onClick={(event) => {
            event.preventDefault();
            router.push("/profil");
          }}
        >
          Profil
        </DropdownMenuLinkItem>
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <span className="text-sm">Motyw</span>
          <ToggleGroup
            aria-label="Motyw"
            value={[preference]}
            onValueChange={onThemeChange}
            className="gap-0! rounded-full bg-muted p-0.5"
          >
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  aria-label={option.label}
                  className="size-7 min-w-7 rounded-full border-0 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm"
                >
                  <Icon className="size-3.5" />
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          className="px-2 py-1.5"
          onClick={() => void logout()}
        >
          {pending ? "Wylogowuję…" : "Wyloguj"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
