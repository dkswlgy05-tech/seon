"use client";

import { useEffect, useState } from "react";
import { useActiveWeek, useDashboardStore } from "@/store/useDashboardStore";

export function EtcPanel() {
  const week = useActiveWeek();
  const updateEtc = useDashboardStore((s) => s.updateEtc);
  const [local, setLocal] = useState(week?.etc ?? "");

  useEffect(() => setLocal(week?.etc ?? ""), [week?.id, week?.etc]);

  if (!week) return null;

  return (
    <section className="hairline rounded-xl bg-surface">
      <header className="px-5 py-4 hairline-b">
        <h2 className="text-[13px] font-semibold tracking-tight">4) 기타</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          자유롭게 보고할 내용을 적습니다. 줄바꿈은 그대로 HWPX에 반영됩니다.
        </p>
      </header>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => local !== week.etc && updateEtc(local)}
        placeholder="예) 차주 OSG 정기교육 일정 안내…"
        className="block w-full resize-y rounded-b-xl bg-transparent p-5 text-sm leading-relaxed outline-none"
        rows={5}
      />
    </section>
  );
}
