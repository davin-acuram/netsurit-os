"use client";

import { useScrollFade } from "@/lib/use-scroll-fade";
import { cn } from "@/lib/utils";

// The dashboard layout's single scrolling container -- wraps the page
// content in a client component so the (server) layout can use the
// scroll-driven auto-hide scrollbar without itself becoming a client
// component.
export function MainScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollFade<HTMLElement>();
  return (
    <main ref={ref} className={cn("scroll-fade", className)}>
      {children}
    </main>
  );
}
