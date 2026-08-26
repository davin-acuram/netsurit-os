"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChartColumnBig,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sprout,
  User,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Each nav icon needs a real fillable area (rects/closed paths, not just
// open stroke lines) so toggling the `fill-current` class on hover/active
// actually reads as a solid-vs-outline swap -- LayoutDashboard's 4 rects
// and Sprout's leaf paths both fill cleanly; a plain magnifying-glass
// Search icon wouldn't (it's just a stroked circle + line), so "Organic"
// uses Sprout instead -- it also reads better for organic-search anyway.
const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: ChartColumnBig },
  { href: "/search-console", label: "Organic", icon: Sprout },
] as const;

const COLLAPSE_STORAGE_KEY = "rail-collapsed";
const COLLAPSE_EVENT = "rail-collapsed-change";

// Below this, the rail is forced to icon-only regardless of the user's
// manual preference -- there isn't room for labels at tablet width.
const TABLET_BREAKPOINT = 1024;
// Below this, the rail leaves the layout entirely and becomes a
// hamburger-triggered drawer -- even icon-only competes with these
// data-heavy tables on a phone.
const MOBILE_BREAKPOINT = 768;

// matchMedia has a native subscribe/change event, which is exactly what
// useSyncExternalStore wants -- avoids the "setState in an effect on
// mount" anti-pattern a useState+useEffect version would hit.
function useIsBelow(breakpointPx: number): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    [breakpointPx],
  );
  const getSnapshot = useCallback(
    () => window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches,
    [breakpointPx],
  );
  const getServerSnapshot = () => false;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Same reasoning for the persisted collapse preference -- reading
// localStorage.getItem in a mount effect would need a synchronous
// setState there too. A tiny external store (with a same-tab custom
// event, since the native "storage" event only fires in other tabs)
// keeps this lint-clean and stays in sync if the user has two tabs open.
function readManualCollapsed(): boolean {
  return localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
}

function subscribeManualCollapsed(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(COLLAPSE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COLLAPSE_EVENT, callback);
  };
}

function writeManualCollapsed(value: boolean) {
  localStorage.setItem(COLLAPSE_STORAGE_KEY, value ? "1" : "0");
  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

function useManualCollapsed(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribeManualCollapsed, readManualCollapsed, () => false);
  return [value, writeManualCollapsed];
}

function NavList({ expanded, onNavigate }: { expanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={expanded ? undefined : item.label}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              expanded ? "justify-start" : "justify-center",
              active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-primary/12 hover:text-primary",
            )}
          >
            <Icon className={cn("size-[18px] shrink-0", active ? "fill-current" : "group-hover:fill-current")} />
            {expanded && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

// useTheme()'s resolvedTheme is undefined during SSR and only resolves
// after mount, which would make the Switch's `checked` prop mismatch
// between server and client render -- next-themes applies the "dark"
// class via a blocking inline script before hydration, so the DOM class
// itself is already correct at hydration time. Reading that directly
// through useSyncExternalStore (server snapshot fixed at false, same
// pattern as the rest of this file) sidesteps the mismatch entirely.
function subscribeDarkClass(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getDarkClassSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getDarkClassServerSnapshot(): boolean {
  return false;
}

function useIsDarkMode(): boolean {
  return useSyncExternalStore(subscribeDarkClass, getDarkClassSnapshot, getDarkClassServerSnapshot);
}

function DarkModeRow({ expanded }: { expanded: boolean }) {
  const { setTheme } = useTheme();
  const isDark = useIsDarkMode();
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground",
        expanded ? "justify-between" : "flex-col gap-1.5",
      )}
    >
      <span className="flex items-center gap-3">
        <Moon className="size-[18px] shrink-0" />
        {expanded && <span>Dark mode</span>}
      </span>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        size="sm"
        aria-label="Toggle dark mode"
      />
    </div>
  );
}

// Settings and Log out have no real destination -- there's no settings
// page or auth system in this app -- so they're rendered as decorative
// rows matching the mockup's structure rather than dead links.
function InertRow({ icon: Icon, label, expanded }: { icon: typeof Settings; label: string; expanded: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/70",
        expanded ? "justify-start" : "justify-center",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {expanded && <span>{label}</span>}
    </div>
  );
}

function BottomSection({ expanded }: { expanded: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      {expanded && (
        <p className="px-3 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/60 uppercase">System</p>
      )}
      <InertRow icon={Settings} label="Settings" expanded={expanded} />
      <DarkModeRow expanded={expanded} />

      <div className="my-2 border-t border-sidebar-border" />

      <div className={cn("flex items-center gap-3 px-3 py-1", !expanded && "justify-center px-0")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="size-4" />
        </div>
        {expanded && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Admin User</p>
            <p className="truncate text-xs text-muted-foreground">Administrator</p>
          </div>
        )}
      </div>

      <InertRow icon={LogOut} label="Log out" expanded={expanded} />
    </div>
  );
}

function SquareMark({ className }: { className?: string }) {
  return (
    <Image
      src="/branding/netsurit-mark.png"
      alt="Netsurit"
      width={40}
      height={40}
      className={cn("size-7", className)}
      priority
    />
  );
}

function HorizontalLogo({ className }: { className?: string }) {
  return (
    <>
      <Image
        src="/branding/netsurit-horizontal-black.png"
        alt="Netsurit"
        width={200}
        height={70}
        className={cn("h-6 w-auto dark:hidden", className)}
        priority
      />
      <Image
        src="/branding/netsurit-horizontal-white.png"
        alt="Netsurit"
        width={200}
        height={70}
        className={cn("hidden h-6 w-auto dark:block", className)}
        priority
      />
    </>
  );
}

export function RailNav() {
  const [manualCollapsed, setManualCollapsed] = useManualCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isTablet = useIsBelow(TABLET_BREAKPOINT);
  const isMobile = useIsBelow(MOBILE_BREAKPOINT);
  const collapsed = isTablet || manualCollapsed;
  // Derived rather than reset via an effect -- the drawer simply isn't
  // rendered once the viewport grows past mobile, whatever drawerOpen holds.
  const showDrawer = drawerOpen && isMobile;

  useEffect(() => {
    if (!showDrawer) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showDrawer]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setDrawerOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <SquareMark className="size-8" />
        <div className="size-8" aria-hidden="true" />
      </div>

      {/* Mobile drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar p-4">
            <div className="flex items-center justify-between">
              <HorizontalLogo className="h-7" />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavList expanded onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-auto">
              <BottomSection expanded />
            </div>
          </div>
        </div>
      )}

      {/* Desktop/tablet rail -- exactly viewport height (h-full inside the
          layout's h-screen row), independent of how tall the page content
          is; see (dashboard)/layout.tsx for the overflow handling that
          makes that true. */}
      <aside
        className={cn(
          "relative hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-[72px] items-center px-3 py-5" : "w-[240px] px-4 py-5",
        )}
      >
        {!isTablet && (
          <button
            type="button"
            aria-label={manualCollapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setManualCollapsed(!manualCollapsed)}
            className="absolute top-7 -right-3 z-10 flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
          >
            {manualCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
          </button>
        )}

        <div className={cn("mb-8 flex items-center", collapsed ? "justify-center" : "justify-start")}>
          {collapsed ? <SquareMark className="size-9" /> : <HorizontalLogo className="h-8" />}
        </div>

        <NavList expanded={!collapsed} />

        <div className="mt-auto pt-4">
          <BottomSection expanded={!collapsed} />
        </div>
      </aside>
    </>
  );
}
