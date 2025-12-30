import { addDays, endOfDay, format, startOfDay } from "date-fns";
import type { TimeRange } from "@/lib/types";

export const getTimeRangeBounds = (range: TimeRange) => {
  const now = new Date();
  if (range === "tomorrow") {
    const start = startOfDay(addDays(now, 1));
    return { start, end: endOfDay(addDays(now, 1)) };
  }
  if (range === "week") {
    const start = startOfDay(now);
    return { start, end: endOfDay(addDays(now, 6)) };
  }
  return { start: startOfDay(now), end: endOfDay(now) };
};

export const formatDateTime = (value?: string | null, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return format(date, "PPP p");
};

export const formatShortDate = (value?: string | null, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return format(date, "MMM d, p");
};
