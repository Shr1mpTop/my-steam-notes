/** Shared formatting helpers. */

export function fmtHours(hours: number): string {
  if (hours >= 1000) return `${Math.round(hours).toLocaleString()}h`;
  if (hours >= 100) return `${hours.toFixed(0)}h`;
  if (hours >= 10) return `${hours.toFixed(1)}h`;
  return `${hours.toFixed(1)}h`;
}

/** Hours → "12.5h" at/above one hour, "38m" below it. */
export function fmtDuration(hours: number): string {
  if (hours > 0 && hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  return fmtHours(hours);
}

export function fmtMinutes(minutes: number): string {
  return minutes >= 60 ? `${(minutes / 60).toFixed(1)}h` : `${Math.round(minutes)}m`;
}

export function fmtCompact(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function truncate(input: string, max: number): string {
  return input.length > max ? `${input.slice(0, Math.max(0, max - 1))}…` : input;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function daysSince(unixSeconds: number, nowSeconds: number): number {
  return Math.max(0, Math.round((nowSeconds - unixSeconds) / 86400));
}
