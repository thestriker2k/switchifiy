export function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDateShort(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

export function intervalLabel(days: number) {
  return days === 1 ? "24 hours" : `${days} days`;
}

export function renderWithTokens({
  subject,
  body,
  previewRecipient,
}: {
  subject: string;
  body: string;
  switchName: string;
  intervalDays: number;
  createdAtIso: string | null;
  previewRecipient: { name: string; email: string } | null;
}) {
  const fullName = (previewRecipient?.name ?? "Recipient Name").trim();
  const firstName = fullName.split(/\s+/).filter(Boolean)[0] || "Recipient";

  const tokenMap: Record<string, string> = {
    "{recipient_name}": fullName,
    "{recipient_first_name}": firstName,
  };

  const apply = (text: string) => {
    let out = text ?? "";
    for (const [token, value] of Object.entries(tokenMap)) {
      out = out.split(token).join(value);
    }
    return out;
  };

  return {
    subject: apply(subject),
    body: apply(body),
  };
}

export function insertTokenAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  current: string,
  token: string,
) {
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);

  requestAnimationFrame(() => {
    try {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    } catch {
      // ignore
    }
  });

  return next;
}

export function wrapSelectionWith(
  el: HTMLInputElement | HTMLTextAreaElement,
  current: string,
  left: string,
  right: string,
) {
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;

  const selected = current.slice(start, end);
  const insert = left + selected + right;

  const next = current.slice(0, start) + insert + current.slice(end);

  requestAnimationFrame(() => {
    try {
      el.focus();
      if (selected.length === 0) {
        const pos = start + left.length;
        el.setSelectionRange(pos, pos);
      } else {
        const selStart = start + left.length;
        const selEnd = selStart + selected.length;
        el.setSelectionRange(selStart, selEnd);
      }
    } catch {
      // ignore
    }
  });

  return next;
}
