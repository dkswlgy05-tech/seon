"use client";

import { useEffect, useState } from "react";
import { Header } from "./Header";
import { BidCalendar } from "./BidCalendar";
import { ProjectTable } from "./ProjectTable";
import { UpcomingTable } from "./UpcomingTable";
import { EducationPanel } from "./EducationPanel";
import { EtcPanel } from "./EtcPanel";

export function DashboardClient() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-fg-muted">
        불러오는 중…
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
          미래사업팀 주간업무 대시보드 · MVP v0.1 · 데이터는 브라우저에 자동 저장됩니다
        </footer>
      </main>
    </div>
  );
}
