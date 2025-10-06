export const getUserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const formatInUserTimeZone = (
  dateInput: string | number | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const timeZone = getUserTimeZone();
  const date = parseDateRespectingUTCIfNoTZ(dateInput);
  const fmt = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    hour12: false,
    timeZone,
    ...options,
  });
  return fmt.format(date);
};

export const formatDateOnlyInUserTimeZone = (
  dateInput: string | number | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const timeZone = getUserTimeZone();
  const date = parseDateRespectingUTCIfNoTZ(dateInput);
  const fmt = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
    ...options,
  });
  return fmt.format(date);
};

// Converts a local datetime string (e.g., from <input type="datetime-local">)
// to a UTC ISO 8601 string suitable for backend persistence
export const toUtcISOString = (localDateTime: string): string => {
  if (!localDateTime) return '';
  return new Date(localDateTime).toISOString();
};

// Parses various backend date strings. If the string lacks timezone info (no 'Z' or ±HH:MM),
// assume it is UTC to avoid treating it as local time inadvertently in browsers.
export const parseDateRespectingUTCIfNoTZ = (dateInput: string | number | Date): Date => {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);
  const value = String(dateInput);
  // If contains 'Z' or timezone offset, trust it
  if (/Z|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value);
  }
  // ISO-like without TZ (allow 'T' or space, optional seconds, optional .fraction up to 6): treat as UTC
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/.test(value)) {
    return new Date(value + 'Z');
  }
  // Fallback
  return new Date(value);
};
