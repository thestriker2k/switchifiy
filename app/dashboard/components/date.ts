// app/dashboard/components/date.ts
// NOTE: no "use client" needed — this is a plain TS module

export function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDateLong(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// date+time formatter that respects a stored IANA timezone
export function formatDateTime(d: Date, timeZone?: string | null) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone ?? undefined,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }
}

export function getBrowserTimeZone(fallback: string = "UTC") {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}
