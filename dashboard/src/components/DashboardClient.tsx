"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Header } from "./Header";
import { BidCalendar } from "./BidCalendar";
import { ProjectTable } from "./ProjectTable";
import { UpcomingTable } from "./UpcomingTable";
import { EducationPanel } from "./EducationPanel";
import { EtcPanel } from "./EtcPanel";

export function DashboardClient() {
  const status = useDashboardStore((s) => s.status);
  const error = useDashboardStore((s) => s.error);
  const init = useDashboardStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-fg-muted">
        Supabase에서 불러오는 중…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md py-32 text-center">
        <h2 className="mb-2 text-sm font-semibold text-red-500">
          데이터를 불러오지 못했습니다
        </h2>
        <p className="text-xs text-fg-muted">
          {error ?? "Supabase 연결을 확인해주세요."}
        </p>
        <button
          onClick={() => init()}
          className="mt-4 rounded-md bg-fg px-3 py-1.5 text-xs text-white"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-[1400px] space-y-6 px-8 py-8">
        <BidCalendar />
        <ProjectTable />
        <UpcomingTable />
        <EducationPanel />
        <EtcPanel />
        <footer className="pb-6 pt-4 text-center text-xs text-fg-subtle">
          미래사업팀 주간업무 대시보드 · MVP v0.1 · Supabase 연동
        </footer>
      </main>
    </div>
  );
}
