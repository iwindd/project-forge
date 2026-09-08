export type DateValue = Date | string | number | null | undefined;

const THAI_DATE_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeZone: "Asia/Bangkok",
});

const THAI_SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(
  "th-TH-u-ca-buddhist",
  {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Bangkok",
  },
);

const THAI_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

const THAI_LONG_DATE_FORMATTER = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

export function toValidDate(value: DateValue) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatThaiDateLong(value: DateValue) {
  const date = toValidDate(value);
  return date ? THAI_LONG_DATE_FORMATTER.format(date) : "";
}

export function toIsoDate(value: DateValue) {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
}

export function formatDate(value: DateValue) {
  const date = toValidDate(value);
  return date ? THAI_DATE_FORMATTER.format(date) : "-";
}

export function formatThaiShortDate(value: DateValue) {
  const date = toValidDate(value);
  return date ? THAI_SHORT_DATE_FORMATTER.format(date) : "-";
}

export function formatDateTime(value: DateValue) {
  const date = toValidDate(value);
  return date ? THAI_DATE_TIME_FORMATTER.format(date) : "-";
}
