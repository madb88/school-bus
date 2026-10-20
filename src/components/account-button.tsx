"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  Bell,
  Crown,
  Monitor,
  Moon,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  getProfileMenuSection,
  subscribeProfileMenuSection,
  type ProfileMenuSection,
} from "@/lib/auth/profile-menu-section";
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

const ACCOUNT_LINKS: ReadonlyArray<{
  id: ProfileMenuSection;
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "profil", href: "/profil", label: "Profil", icon: UserRound },
  { id: "plus", href: "/profil?plus=1", label: "Plan Plus", icon: Crown },
  {
    id: "powiadomienia",
    href: "/profil?powiadomienia=1",
    label: "Powiadomienia",
    icon: Bell,
  },
];

export function AccountButton({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const signedIn = email !== null;
  const active = signedIn ? pathname === "/profil" : pathname === "/login";
  const menuSection = useSyncExternalStore(
    subscribeProfileMenuSection,
    getProfileMenuSection,
    () => null,
  );
  const { preference, setThemePreference } = useTheme();
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const triggerLabel = signedIn ? "Konto" : "Menu konta";
  const triggerClassName = cn(
    "size-9 shrink-0 border-border/80 bg-card/70 backdrop-blur-sm",
    active && "border-transparent bg-bus text-bus-foreground hover:bg-bus/90",
  );

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
      setSheetOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Nie udało się połączyć z serwerem.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={triggerLabel}
              title={triggerLabel}
              className={cn(triggerClassName, "md:hidden")}
            />
          }
        >
          <UserRound aria-hidden className="size-4" />
        </SheetTrigger>
        <SheetContent side="right" className="gap-0 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{signedIn ? "Konto" : "Menu konta"}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-4 pb-4">
            {signedIn ? (
              <>
                <p
                  className="truncate px-3 py-2 text-sm font-medium text-foreground"
                  title={email}
                >
                  {email}
                </p>
                {ACCOUNT_LINKS.map((item) => {
                  const Icon = item.icon;
                  const itemActive =
                    pathname === "/profil" && menuSection === item.id;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                        itemActive
                          ? "bg-bus text-bus-foreground"
                          : "text-muted-foreground hover:bg-bus/10 hover:text-bus-deep",
                      )}
                      aria-current={itemActive ? "page" : undefined}
                    >
                      <Icon aria-hidden className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            ) : null}

            <div className="px-3 py-3">
              <ThemeToggle
                preference={preference}
                onChange={onThemeChange}
                size="comfortable"
              />
            </div>

            <div className="border-t border-border/60 pt-3">
              {signedIn ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  disabled={pending}
                  onClick={() => void logout()}
                >
                  {pending ? "Wylogowuję…" : "Wyloguj"}
                </Button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "inline-flex w-full items-center rounded-lg px-3 py-3 text-base font-medium transition-colors",
                    pathname === "/login"
                      ? "bg-bus text-bus-foreground"
                      : "text-muted-foreground hover:bg-bus/10 hover:text-bus-deep",
                  )}
                  aria-current={pathname === "/login" ? "page" : undefined}
                >
                  Zaloguj się
                </Link>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={triggerLabel}
              title={triggerLabel}
              className={cn(triggerClassName, "hidden md:inline-flex")}
            />
          }
        >
          <UserRound aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 min-w-64">
          {signedIn ? (
            <>
              <div className="px-2 py-1.5">
                <p
                  className="truncate text-sm font-medium text-foreground"
                  title={email}
                >
                  {email}
                </p>
              </div>
              <DropdownMenuSeparator />
              {ACCOUNT_LINKS.map((item) => (
                <DropdownMenuLinkItem
                  key={item.href}
                  href={item.href}
                  closeOnClick
                  className="px-2 py-1.5"
                  onClick={(event) => {
                    event.preventDefault();
                    router.push(item.href);
                  }}
                >
                  {item.label}
                </DropdownMenuLinkItem>
              ))}
            </>
          ) : null}

          <div className="px-2 py-1.5">
            <ThemeToggle preference={preference} onChange={onThemeChange} />
          </div>

          <DropdownMenuSeparator />

          {signedIn ? (
            <DropdownMenuItem
              disabled={pending}
              className="px-2 py-1.5"
              onClick={() => void logout()}
            >
              {pending ? "Wylogowuję…" : "Wyloguj"}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuLinkItem
              href="/login"
              closeOnClick
              className="px-2 py-1.5"
              onClick={(event) => {
                event.preventDefault();
                router.push("/login");
              }}
            >
              Zaloguj się
            </DropdownMenuLinkItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function ThemeToggle({
  preference,
  onChange,
  size = "compact",
}: {
  preference: ThemePreference;
  onChange: (value: string[]) => void;
  size?: "compact" | "comfortable";
}) {
  const comfortable = size === "comfortable";

  return (
    <div
      className={cn(
        "flex",
        comfortable ? "items-stretch" : "items-center justify-between gap-3",
      )}
    >
      {comfortable ? null : <span className="text-sm">Motyw</span>}
      <ToggleGroup
        aria-label="Motyw"
        value={[preference]}
        onValueChange={onChange}
        className={cn(
          "gap-0! rounded-full bg-muted p-0.5",
          comfortable && "w-full p-1",
        )}
      >
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.label}
              className={cn(
                "rounded-full border-0 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm",
                comfortable
                  ? "h-10 min-w-0 flex-1"
                  : "size-7 min-w-7",
              )}
            >
              <Icon className={comfortable ? "size-4" : "size-3.5"} />
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
