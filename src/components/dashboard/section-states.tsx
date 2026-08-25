import { AlertTriangle, Inbox } from "lucide-react";

export function EmptyState({ message = "No data synced yet for this range." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <Inbox className="size-6" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ message = "Couldn't load this data." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-destructive">
      <AlertTriangle className="size-6" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
