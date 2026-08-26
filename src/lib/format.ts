const numberFormatter = new Intl.NumberFormat("en-US");
const compactFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
// Fixed to UTC -- these components are Server Components rendered once,
// so a viewer-local timezone would be misleading rather than accurate.
// dateStyle/timeStyle can't be combined with the timeZoneName component
// option (Intl throws), so the "UTC" suffix is appended manually below.
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits);
}

export function formatDateTime(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} UTC`;
}

export function formatDeltaPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
