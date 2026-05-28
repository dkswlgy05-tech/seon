"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  useActiveWeek,
  useDashboardStore,
  useLeaderSuggestions,
} from "@/store/useDashboardStore";
import type { ProjectStatus } from "@/lib/types";
import { EditableCell } from "./EditableCell";

const TABS: ProjectStatus[] = ["개찰", "진행중"];

export function ProjectTable() {
  const week = useActiveWeek();
  const updateProject = useDashboardStore((s) => s.updateProject);
  const deleteProject = useDashboardStore((s) => s.deleteProject);
  const addProject = useDashboardStore((s) => s.addProject);
  const leaderOpts = useLeaderSuggestions();

  const [tab, setTab] = useState<ProjectStatus>("개찰");

  const rows = useMemo(
    () => week?.projects.filter((p) => p.status === tab) ?? [],
    [week, tab]
  );

  const totals = useMemo(() => {
    const allRows = week?.projects ?? [];
    const sum = (s?: ProjectStatus) =>
      allRows
        .filter((p) => !s || p.status === s)
        .reduce((acc, p) => acc + (Number(p.fee) || 0), 0);
    return {
      open: sum("개찰"),
      progress: sum("진행중"),
      total: sum(),
      countOpen: allRows.filter((p) => p.status === "개찰").length,
      countProgress: allRows.filter((p) => p.status === "진행중").length,
    };
  }, [week]);

  if (!week) return null;

  return (
    <section className="hairline rounded-xl bg-surface">
      <header className="flex flex-col gap-3 px-5 py-4 hairline-b lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight">
            1) 수행 Project (공동수행)
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            총 {totals.countOpen + totals.countProgress}건 · 합계 {fmt(totals.total)}억
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hairline inline-flex overflow-hidden rounded-md text-sm">
            {TABS.map((t) => {
              const count = t === "개찰" ? totals.countOpen : totals.countProgress;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    "px-3 py-1.5",
                    tab === t
                      ? "bg-fg text-white"
                      : "bg-surface text-fg-muted hover:bg-bg"
                  )}
                >
                  {t}
                  <span className="ml-1.5 text-[11px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => addProject(tab)}
            className="hairline rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-bg focus-ring"
          >
            + 행 추가
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-[13px]">
          <thead className="bg-bg text-left text-xs text-fg-muted">
            <tr>
              <th className="w-12 px-3 py-2 text-center">#</th>
              <th className="px-3 py-2">용역명</th>
              <th className="w-24 px-3 py-2">단장</th>
              <th className="w-20 px-3 py-2">제출일</th>
              <th className="w-24 px-3 py-2">발표/면접</th>
              <th className="w-20 px-3 py-2">개찰일</th>
              <th className="w-24 px-3 py-2 text-right">용역비(억)</th>
              <th className="px-3 py-2">내용</th>
              <th className="w-20 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-10 text-center text-sm text-fg-muted"
                >
                  {tab} 상태인 프로젝트가 없습니다. 우측 상단 ‘+ 행 추가’를 눌러 시작하세요.
                </td>
              </tr>
            )}
            {rows.map((p, idx) => (
              <tr
                key={p.id}
                data-row-id={p.id}
                className="group transition hairline-b last:border-b-0 hover:bg-bg/60"
              >
                <td className="px-3 py-1 text-center text-xs text-fg-muted">{idx + 1}</td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={p.name}
                    onCommit={(v) => updateProject(p.id, { name: v })}
                    placeholder="용역명"
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={p.leader}
                    onCommit={(v) => updateProject(p.id, { leader: v })}
                    placeholder="단장"
                    type="list"
                    options={leaderOpts}
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={p.submitDate}
                    onCommit={(v) => updateProject(p.id, { submitDate: v })}
                    placeholder="M/D"
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={p.interviewDate}
                    onCommit={(v) => updateProject(p.id, { interviewDate: v })}
                    placeholder="M/D"
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={p.bidDate}
                    onCommit={(v) => updateProject(p.id, { bidDate: v })}
                    placeholder="M/D"
                  />
                </td>
                <td className="px-1 py-1 text-right">
                  <EditableCell
                    value={p.fee}
                    onCommit={(v) => updateProject(p.id, { fee: v })}
                    placeholder="0.0"
                    className="text-right tabular-nums"
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={p.note}
                    onCommit={(v) => updateProject(p.id, { note: v })}
                    placeholder="내용"
                    type="textarea"
                  />
                </td>
                <td className="px-1 py-1">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        const next: ProjectStatus = p.status === "개찰" ? "진행중" : "개찰";
                        updateProject(p.id, { status: next });
                      }}
                      className="invisible rounded px-1.5 py-1 text-[11px] text-fg-muted hover:bg-bg hover:text-accent group-hover:visible"
                      title={`${p.status === "개찰" ? "진행중" : "개찰"}으로 이동`}
                      aria-label={`${p.status === "개찰" ? "진행중" : "개찰"}으로 이동`}
                    >
                      → {p.status === "개찰" ? "진행중" : "개찰"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("이 행을 삭제할까요?")) deleteProject(p.id);
                      }}
                      className="invisible rounded p-1 text-fg-subtle hover:bg-bg hover:text-red-500 group-hover:visible"
                      aria-label="행 삭제"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="hairline-t bg-bg/60 text-xs text-fg-muted">
                <td colSpan={6} className="px-3 py-2 text-right">
                  {tab} 합계
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmt(tab === "개찰" ? totals.open : totals.progress)}억
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
