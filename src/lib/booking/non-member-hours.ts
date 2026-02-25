import type { NonMemberAllowedHours, WeekdayKey } from "@/lib/booking/types";

const WEEKDAY_KEYS: WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getWeekdayKeyFromDate(value: string): WeekdayKey {
  const date = new Date(`${value}T00:00:00`);
  return WEEKDAY_KEYS[date.getDay()] ?? "monday";
}

export function isNonMemberHourAllowed(
  date: string,
  hour: number,
  allowedHours: NonMemberAllowedHours,
): boolean {
  const weekday = getWeekdayKeyFromDate(date);
  const ranges = allowedHours[weekday] ?? [];

  if (ranges.length === 0) {
    return true;
  }

  return ranges.some((range) => hour >= range.start && hour < range.end);
}
