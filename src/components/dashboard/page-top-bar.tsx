import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";

// Notification bell is decorative -- there's no notification system in
// this app, it's here to match the reference layout's top-bar structure.
export function PageTopBar({ page }: { page: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{page}</span>
      </nav>
      <button
        type="button"
        aria-label="Notifications"
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Bell className="size-[18px]" />
      </button>
    </div>
  );
}
