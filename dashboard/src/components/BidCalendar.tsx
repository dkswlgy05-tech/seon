"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useActiveWeek } from "@/store/useDashboardStore";
import {
  dayLabel,
  getMonthGrid,
  monthLabel,
  parseShortDate,
  shiftMonth,
} from "@/lib/date";
import { isSameDay } from "date-fns";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function BidCalendar() {
  const week = useActiveWeek();
  const [anchor, setAnchor] = useState<Date>(() => initialAnchor(week?.label));

  const days = useMemo(() => getMonthGrid(anchor), [anchor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { name: string; status: string; id: string }[]>();
    week?.projects.forEach((p) => {
      const d = parseShortDate(p.bidDate, anchor);
      if (!d) return;
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ name: p.name || "(이름 없음)", status: p.status, id: p.id });
    });
    return map;
  }, [week, anchor]);

  const stats = useMemo(() => {
    const items: { name: string; status: string; id: string; date: Date }[] = [];
    eventsByDay.forEach((events, key) => {
      const date = new Date(key);
      events.forEach((e) => items.push({ ...e, date }));
    });
    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    return items;
  }, [eventsByDay]);

  function scrollToRow(id: string) {
    const el = document.querySelector(`[data-row-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-accent");
      setTimeout(() => el.classList.remove("ring-2", "ring-accent"), 1500);
    }
  }

  return (
    <section className="hairline rounded-xl bg-surface">
      <div className="flex items-center justify-between px-5 py-4 hairline-b">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight">월별 개찰 일정</h2>
          <p className="text-xs text-fg-muted">
            개찰일 기준 · 총 {stats.length}건 표시 · 칩을 클릭하면 표에서 위치를 강조합니다
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAnchor((a) => shiftMonth(a, -1))}
            className="hairline rounded-md px-2 py-1 text-sm hover:bg-bg focus-ring"
            aria-label="이전 달"
          >
            ‹
          </button>
          <div className="min-w-[7rem] text-center text-sm font-medium">
            {monthLabel(anchor)}
          </div>
          <button
            onClick={() => setAnchor((a) => shiftMonth(a, +1))}
            className="hairline rounded-md px-2 py-1 text-sm hover:bg-bg focus-ring"
            aria-label="다음 달"
          >
            ›
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="hairline ml-2 rounded-md px-2 py-1 text-sm hover:bg-bg focus-ring"
          >
            오늘
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 hairline-b text-xs text-fg-muted">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={clsx(
              "px-3 py-2 text-center",
              i === 0 && "text-red-500",
              i === 6 && "text-blue-500"
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const events = eventsByDay.get(d.date.toDateString()) || [];
          const isToday = d.isToday;
          return (
            <div
              key={i}
              className={clsx(
                "min-h-[90px] hairline-r hairline-b p-2",
                (i + 1) % 7 === 0 && "border-r-0",
                i >= days.length - 7 && "border-b-0",
                !d.inMonth && "bg-bg/60"
              )}
            >
              <div className="mb-1 flex items-center gap-1">
                <span
                  className={clsx(
                    "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full text-[11px]",
                    isToday && "bg-accent text-white",
                    !isToday && !d.inMonth && "text-fg-subtle",
                    !isToday && d.inMonth && "text-fg"
                  )}
                >
                  {dayLabel(d.date)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {events.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => scrollToRow(e.id)}
                    className={clsx(
                      "truncate rounded px-1.5 py-0.5 text-left text-[11px] focus-ring",
                      e.status === "개찰"
                        ? "bg-status-bid text-status-bid-fg"
                        : "bg-status-progress text-status-progress-fg"
                    )}
                    title={e.name}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function initialAnchor(label: string | undefined): Date {
  if (!label) return new Date();
  const m = label.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
