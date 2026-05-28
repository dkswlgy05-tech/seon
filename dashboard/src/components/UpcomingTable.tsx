"use client";

import {
  useActiveWeek,
  useDashboardStore,
  useLeaderSuggestions,
} from "@/store/useDashboardStore";
import { EditableCell } from "./EditableCell";

export function UpcomingTable() {
  const week = useActiveWeek();
  const addUpcoming = useDashboardStore((s) => s.addUpcoming);
  const updateUpcoming = useDashboardStore((s) => s.updateUpcoming);
  const deleteUpcoming = useDashboardStore((s) => s.deleteUpcoming);
  const leaderOpts = useLeaderSuggestions();

  if (!week) return null;

  return (
    <section className="hairline rounded-xl bg-surface">
      <header className="flex items-center justify-between px-5 py-4 hairline-b">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight">
            2) 발주예상 Project (공동예정)
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            발주 예정인 건을 미리 추적합니다.
          </p>
        </div>
        <button
          onClick={addUpcoming}
          className="hairline rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-bg focus-ring"
        >
          + 행 추가
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-[13px]">
          <thead className="bg-bg text-left text-xs text-fg-muted">
            <tr>
              <th className="w-12 px-3 py-2 text-center">#</th>
              <th className="px-3 py-2">Project</th>
              <th className="w-32 px-3 py-2">발주청</th>
              <th className="w-24 px-3 py-2">단장</th>
              <th className="w-24 px-3 py-2 text-right">사업비(억)</th>
              <th className="w-20 px-3 py-2">발주(월)</th>
              <th className="w-24 px-3 py-2 text-right">용역비(억)</th>
              <th className="px-3 py-2">내용</th>
              <th className="w-10 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {week.upcoming.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-10 text-center text-sm text-fg-muted"
                >
                  아직 등록된 발주예상 Project가 없습니다.
                </td>
              </tr>
            )}
            {week.upcoming.map((u, idx) => (
              <tr
                key={u.id}
                className="group hairline-b last:border-b-0 hover:bg-bg/60"
              >
                <td className="px-3 py-1 text-center text-xs text-fg-muted">{idx + 1}</td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={u.name}
                    onCommit={(v) => updateUpcoming(u.id, { name: v })}
                    placeholder="Project"
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={u.client}
                    onCommit={(v) => updateUpcoming(u.id, { client: v })}
                    placeholder="발주청"
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={u.leader}
                    onCommit={(v) => updateUpcoming(u.id, { leader: v })}
                    placeholder="단장"
                    type="list"
                    options={leaderOpts}
                  />
                </td>
                <td className="px-1 py-1 text-right">
                  <EditableCell
                    value={u.budget}
                    onCommit={(v) => updateUpcoming(u.id, { budget: v })}
                    placeholder="0.0"
                    className="text-right tabular-nums"
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={u.orderMonth}
                    onCommit={(v) => updateUpcoming(u.id, { orderMonth: v })}
                    placeholder="M월"
                  />
                </td>
                <td className="px-1 py-1 text-right">
                  <EditableCell
                    value={u.fee}
                    onCommit={(v) => updateUpcoming(u.id, { fee: v })}
                    placeholder="0.0"
                    className="text-right tabular-nums"
                  />
                </td>
                <td className="px-1 py-1">
                  <EditableCell
                    value={u.note}
                    onCommit={(v) => updateUpcoming(u.id, { note: v })}
                    placeholder="내용"
                    type="textarea"
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  <button
                    onClick={() => {
                      if (confirm("이 행을 삭제할까요?")) deleteUpcoming(u.id);
                    }}
                    className="invisible rounded p-1 text-fg-subtle hover:bg-bg hover:text-red-500 group-hover:visible"
                    aria-label="행 삭제"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
