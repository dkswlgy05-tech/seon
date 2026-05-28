"use client";

import { useState } from "react";
import { useActiveWeek, useDashboardStore } from "@/store/useDashboardStore";
import { EDUCATION_ROLES, type EducationRole } from "@/lib/types";

export function EducationPanel() {
  const week = useActiveWeek();
  const addMember = useDashboardStore((s) => s.addMember);
  const updateMember = useDashboardStore((s) => s.updateMember);
  const deleteMember = useDashboardStore((s) => s.deleteMember);

  if (!week) return null;

  return (
    <section className="hairline rounded-xl bg-surface">
      <header className="px-5 py-4 hairline-b">
        <h2 className="text-[13px] font-semibold tracking-tight">
          3) 교육참가자 (OSG팀)
        </h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          분야별 기술자 명단을 칩으로 관리합니다. 클릭하면 편집되고, X로 제거합니다.
        </p>
      </header>
      <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
        {EDUCATION_ROLES.map((role) => {
          const members = week.members.filter((m) => m.role === role);
          return (
            <div key={role} className="hairline rounded-lg bg-bg/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-fg-muted">{role}</span>
                  <span className="text-[11px] text-fg-subtle">
                    {members.length}명
                  </span>
                </div>
                <button
                  onClick={() => addMember(role)}
                  className="rounded px-2 py-1 text-xs text-fg-muted hover:bg-surface"
                >
                  + 추가
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.length === 0 && (
                  <span className="text-xs text-fg-subtle">— 없음</span>
                )}
                {members.map((m) => (
                  <Chip
                    key={m.id}
                    name={m.name}
                    org={m.org}
                    onChange={(name, org) => updateMember(m.id, { name, org })}
                    onDelete={() => deleteMember(m.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Chip({
  name,
  org,
  onChange,
  onDelete,
}: {
  name: string;
  org: string;
  onChange: (name: string, org: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(name === "");
  const [n, setN] = useState(name);
  const [o, setO] = useState(org);

  function commit() {
    setEditing(false);
    if (n !== name || o !== org) onChange(n.trim(), o.trim());
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-surface hairline px-2 py-1 text-xs">
        <input
          autoFocus
          value={n}
          onChange={(e) => setN(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setN(name);
              setO(org);
              setEditing(false);
            }
          }}
          onBlur={commit}
          placeholder="이름"
          className="w-16 bg-transparent outline-none"
        />
        <input
          value={o}
          onChange={(e) => setO(e.target.value)}
          placeholder="소속"
          className="w-14 bg-transparent text-fg-muted outline-none"
        />
      </span>
    );
  }

  return (
    <span className="group inline-flex items-center gap-1 rounded-md bg-surface hairline px-2 py-1 text-xs">
      <button
        onClick={() => setEditing(true)}
        className="font-medium hover:text-accent"
      >
        {name || "(이름 없음)"}
      </button>
      {org && <span className="text-fg-subtle">({org})</span>}
      <button
        onClick={onDelete}
        className="ml-0.5 text-fg-subtle opacity-0 hover:text-red-500 group-hover:opacity-100"
        aria-label="삭제"
      >
        ×
      </button>
    </span>
  );
}
