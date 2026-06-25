"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useDashboardStore, useActiveWeek } from "@/store/useDashboardStore";

export function Header() {
  const week = useActiveWeek();
  const weeks = useDashboardStore((s) => s.weeks);
  const setActiveWeek = useDashboardStore((s) => s.setActiveWeek);
  const addWeek = useDashboardStore((s) => s.addWeek);
  const [downloading, setDownloading] = useState(false);
  const { data: session } = useSession();

  async function handleDownload() {
    if (!week) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/hwpx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(week),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `미래사업팀_주간업무_${week.label}.hwpx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("HWPX 생성에 실패했습니다: " + (e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  function handleAddWeek() {
    const label = prompt("새 주차 라벨 (예: 2026.5.27.)", suggestNextLabel(week?.label));
    if (label) addWeek(label.trim());
  }

  return (
    <header className="sticky top-0 z-30 hairline-b bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-semibold text-white">
            미
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-fg">
              미래사업팀 주간업무
            </h1>
            <p className="text-xs text-fg-muted">Weekly Project Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="hairline rounded-md bg-surface px-3 py-1.5 text-sm focus-ring"
            value={week?.id}
            onChange={(e) => setActiveWeek(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddWeek}
            className="hairline rounded-md bg-surface px-3 py-1.5 text-sm text-fg-muted hover:bg-bg focus-ring"
          >
            + 새 주차
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-md bg-fg px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 focus-ring"
          >
            {downloading ? "생성 중…" : "HWPX 다운로드"}
          </button>

          {session?.user && (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  className="h-7 w-7 rounded-full"
                />
              )}
              <span className="text-sm text-fg-muted hidden sm:block">
                {session.user.name}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="hairline rounded-md bg-surface px-3 py-1.5 text-sm text-fg-muted hover:bg-bg focus-ring"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function suggestNextLabel(prev: string | undefined): string {
  if (!prev) return "";
  const m = prev.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}.`;
}
