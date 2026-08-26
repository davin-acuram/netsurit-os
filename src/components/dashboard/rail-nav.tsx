"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronLeft, ChevronRight, LayoutDashboard, Menu, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/search-console", label: "Organic", icon: Search },
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
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              expanded ? "justify-start" : "justify-center",
              active
                ? "border-l-2 border-primary bg-primary/10 text-primary"
                : "border-l-2 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            {expanded && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function SquareMark({ className }: { className?: string }) {
  return (
    <Image
      src="/branding/netsurit-mark.png"
      alt="Netsurit"
      width={32}
      height={32}
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
        width={170}
        height={60}
        className={cn("h-6 w-auto dark:hidden", className)}
        priority
      />
      <Image
        src="/branding/netsurit-horizontal-white.png"
        alt="Netsurit"
        width={170}
        height={60}
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
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setDrawerOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <SquareMark />
        <ThemeToggle />
      </div>

      {/* Mobile drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4">
            <div className="flex items-center justify-between">
              <HorizontalLogo />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavList expanded onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop/tablet rail */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-[72px] items-center px-3 py-4" : "w-[240px] px-4 py-4",
        )}
      >
        <div className={cn("mb-6 flex items-center", collapsed ? "justify-center" : "justify-start")}>
          {collapsed ? <SquareMark /> : <HorizontalLogo />}
        </div>

        <NavList expanded={!collapsed} />

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {!isTablet && (
            <button
              type="button"
              aria-label={manualCollapsed ? "Expand navigation" : "Collapse navigation"}
              onClick={() => setManualCollapsed(!manualCollapsed)}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "self-center",
              )}
            >
              {manualCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          )}
          <div className={cn("flex", collapsed ? "justify-center" : "justify-start")}>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
