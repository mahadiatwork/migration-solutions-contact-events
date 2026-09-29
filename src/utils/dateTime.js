import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const FALLBACK_DEVICE_TIMEZONE = "UTC";
const EXPLICIT_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export const getDeviceTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_DEVICE_TIMEZONE;

export const hasExplicitTimezone = (value) =>
  typeof value === "string" && EXPLICIT_OFFSET_PATTERN.test(value.trim());

// Offset-bearing CRM values are instants. Legacy values without an offset are
// wall-clock values in the user's device timezone and must remain compatible.
export const parseCrmDateTime = (value, timeZone = getDeviceTimezone()) => {
  if (!value) return null;

  const source = dayjs(value);
  if (!source.isValid()) return null;

  let parsed;
  try {
    parsed =
      typeof value === "string" && !hasExplicitTimezone(value)
        ? dayjs.tz(value, timeZone)
        : source.tz(timeZone);
  } catch {
    return null;
  }

  return parsed?.isValid() ? parsed : null;
};

export const formatDateTimeForCrm = (
  value,
  timeZone = getDeviceTimezone()
) => {
  const parsed = parseCrmDateTime(value, timeZone);
  return parsed ? parsed.format("YYYY-MM-DDTHH:mm:ssZ") : null;
};

export const getActivityDateParts = (
  value,
  timeZone = getDeviceTimezone()
) => {
  const parsed = parseCrmDateTime(value, timeZone);
  if (!parsed) {
    return {
      dateLabel: "—",
      dateKey: null,
      timeLabel: "--:--",
      timestamp: null,
    };
  }

  return {
    dateLabel: parsed.format("DD/MM/YYYY"),
    dateKey: parsed.format("YYYY-MM-DD"),
    timeLabel: parsed.format("HH:mm"),
    timestamp: parsed.valueOf(),
  };
};

export const isValidDateOnly = (value) =>
  typeof value === "string" &&
  dayjs(value, "YYYY-MM-DD", true).isValid();

// Date-only values are compared as calendar strings and are never converted
// through UTC, avoiding an off-by-one day near timezone boundaries.
export const isDateKeyInRange = (dateKey, startDate, endDate) =>
  isValidDateOnly(dateKey) &&
  isValidDateOnly(startDate) &&
  isValidDateOnly(endDate) &&
  dateKey >= startDate &&
  dateKey <= endDate;
