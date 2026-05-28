import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWeekend,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarDay = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  weekend: boolean;
};

export function getMonthGrid(anchor: Date): CalendarDay[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  const days: CalendarDay[] = [];
  const today = new Date();
  for (
    let d = new Date(start);
    d <= end;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    days.push({
      date: new Date(d),
      inMonth: isSameMonth(d, anchor),
      isToday: isSameDay(d, today),
      weekend: isWeekend(d),
    });
  }
  return days;
}

export function parseShortDate(short: string, anchor: Date): Date | null {
  if (!short) return null;
  const trimmed = short.trim();
  if (!/^\d{1,2}\/\d{1,2}$/.test(trimmed)) return null;
  try {
    const parsed = parse(
      `${anchor.getFullYear()}/${trimmed}`,
      "yyyy/M/d",
      new Date()
    );
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function shiftMonth(anchor: Date, delta: number): Date {
  return addMonths(anchor, delta);
}

export function monthLabel(d: Date): string {
  return format(d, "yyyy년 M월");
}

export function dayLabel(d: Date): string {
  return format(d, "d");
}
