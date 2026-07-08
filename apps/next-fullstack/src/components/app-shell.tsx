"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import { CalendarDays, History, LayoutDashboard, LogOut, Moon, Search, Scissors, Settings, Sun, UserRound, UsersRound } from "lucide-react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api, clearToken } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Boshqaruv", icon: LayoutDashboard },
  { href: "/queue", label: "Navbat", icon: CalendarDays },
  { href: "/customers", label: "Mijozlar", icon: UsersRound },
  { href: "/history", label: "Tarix", icon: History },
  { href: "/profile", label: "Profil", icon: UserRound },
  { href: "/settings", label: "Sozlamalar", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { commandOpen, setCommandOpen } = useAppStore();

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  async function logout() {
    await api.logout().catch(() => null);
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background/80 p-4 backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-12 items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Atlas Queue</p>
              <p className="text-xs text-muted-foreground">Barber boshqaruvi</p>
            </div>
          </div>
          <nav className="mt-8 grid gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    active && "bg-secondary text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Temani almashtirish">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button variant="outline" className="flex-1" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Chiqish
            </Button>
          </div>
        </div>
      </aside>
      <main className="pb-24 lg:pl-64 lg:pb-0">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8 lg:py-4">
          <div className="mb-3 flex items-center justify-between rounded-lg border bg-background/90 p-3 backdrop-blur lg:hidden">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <Scissors className="h-4 w-4" />
              <span className="truncate">Atlas Queue</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Temani almashtirish">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Button variant="outline" size="icon" onClick={logout} aria-label="Chiqish">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mb-4 hidden items-center justify-between rounded-lg border bg-background/80 px-4 py-3 backdrop-blur lg:flex">
            <div className="text-sm text-muted-foreground">Atlas Queue / {nav.find((item) => item.href === pathname)?.label ?? "Ish maydoni"}</div>
            <Button variant="outline" onClick={() => setCommandOpen(true)}>
              <Search className="h-4 w-4" />
              Qidirish
            </Button>
          </div>
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            {children}
          </motion.div>
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-soft backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "bg-secondary text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} onNavigate={(href) => router.push(href)} />
    </div>
  );
}

function CommandPalette({ open, onOpenChange, onNavigate }: { open: boolean; onOpenChange: (open: boolean) => void; onNavigate: (href: string) => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-start bg-black/35 px-4 pt-24 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="mx-auto w-full max-w-xl rounded-lg border bg-card shadow-soft" onClick={(event) => event.stopPropagation()}>
            <Command className="[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:w-full [&_[cmdk-input]]:border-b [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-4 [&_[cmdk-input]]:outline-none">
              <Command.Input placeholder="Sahifa va amallarni qidiring..." autoFocus />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="p-4 text-sm text-muted-foreground">Natija topilmadi.</Command.Empty>
                {nav.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-secondary"
                    onSelect={() => {
                      onNavigate(item.href);
                      onOpenChange(false);
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
