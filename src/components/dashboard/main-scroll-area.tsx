"use client";

import { useScrollFade } from "@/lib/use-scroll-fade";
import { cn } from "@/lib/utils";

// The dashboard layout's single scrolling container -- wraps the page
// content in a client component so the (server) layout can use the
// scroll-driven auto-hide scrollbar without itself becoming a client
// component.
//
// This element must span the FULL flex-1 width with no max-width of its
// own: a max-width + mx-auto directly on the scrolling element gets
// centered via flex auto-margins, and that margin lands outside the
// scrollable box -- on wide viewports it shows up as a permanent dead
// strip beyond the scrollbar, with no content and no scroll affordance.
// Centering/capping page content belongs on an inner wrapper instead
// (see (dashboard)/layout.tsx), so the scrollbar always sits flush
// against the true edge of the viewport.
export function MainScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollFade<HTMLElement>();
  return (
    <main ref={ref} className={cn("scroll-fade h-full w-full flex-1 overflow-y-auto", className)}>
      {children}
    </main>
  );
}
