"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type {
  EducationMember,
  EducationRole,
  Project,
  ProjectStatus,
  UpcomingProject,
  Week,
} from "@/lib/types";
import { seedWeek } from "@/lib/seed";

const uid = () => Math.random().toString(36).slice(2, 10);

type State = {
  weeks: Week[];
  activeWeekId: string;
};

type Actions = {
  setActiveWeek: (id: string) => void;
  addWeek: (label: string) => void;

  addProject: (status: ProjectStatus) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addUpcoming: () => void;
  updateUpcoming: (id: string, patch: Partial<UpcomingProject>) => void;
  deleteUpcoming: (id: string) => void;

  addMember: (role: EducationRole) => void;
  updateMember: (id: string, patch: Partial<EducationMember>) => void;
  deleteMember: (id: string) => void;

  updateEtc: (text: string) => void;
};

export const useDashboardStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      weeks: [seedWeek],
      activeWeekId: seedWeek.id,

      setActiveWeek: (id) => set({ activeWeekId: id }),

      addWeek: (label) => {
        const prev = get().weeks.find((w) => w.id === get().activeWeekId);
        const newWeek: Week = prev
          ? {
              ...prev,
              id: uid(),
              label,
              projects: prev.projects.map((p) => ({ ...p, id: uid() })),
              upcoming: prev.upcoming.map((u) => ({ ...u, id: uid() })),
              members: prev.members.map((m) => ({ ...m, id: uid() })),
            }
          : { ...seedWeek, id: uid(), label };
        set((s) => ({ weeks: [...s.weeks, newWeek], activeWeekId: newWeek.id }));
      },

      addProject: (status) =>
        set((s) => {
          const proj: Project = {
            id: uid(),
            status,
            name: "",
            leader: "",
            submitDate: "",
            interviewDate: "",
            bidDate: "",
            fee: "",
            note: "",
          };
          return mutateActive(s, (w) => ({
            ...w,
            projects: [...w.projects, proj],
          }));
        }),

      updateProject: (id, patch) =>
        set((s) =>
          mutateActive(s, (w) => ({
            ...w,
            projects: w.projects.map((p) =>
              p.id === id ? { ...p, ...patch } : p
            ),
          }))
        ),

      deleteProject: (id) =>
        set((s) =>
          mutateActive(s, (w) => ({
            ...w,
            projects: w.projects.filter((p) => p.id !== id),
          }))
        ),

      addUpcoming: () =>
        set((s) => {
          const u: UpcomingProject = {
            id: uid(),
            name: "",
            client: "",
            leader: "",
            budget: "",
            orderMonth: "",
            fee: "",
            note: "",
          };
          return mutateActive(s, (w) => ({
            ...w,
            upcoming: [...w.upcoming, u],
          }));
        }),

      updateUpcoming: (id, patch) =>
        set((s) =>
          mutateActive(s, (w) => ({
            ...w,
            upcoming: w.upcoming.map((u) =>
              u.id === id ? { ...u, ...patch } : u
            ),
          }))
        ),

      deleteUpcoming: (id) =>
        set((s) =>
          mutateActive(s, (w) => ({
            ...w,
            upcoming: w.upcoming.filter((u) => u.id !== id),
          }))
        ),

      addMember: (role) =>
        set((s) =>
          mutateActive(s, (w) => ({
            ...w,
            members: [...w.members, { id: uid(), role, name: "", org: "" }],
          }))
        ),

      updateMember: (id, patch) =>
        set((s) =>
          mutateActive(s, (w) => ({
            ...w,
            members: w.members.map((m) =>
              m.id === id ? { ...m, ...patch } : m
            ),
          }))
        ),

      deleteMember: (id) =>
        set((s) =>
          mutateActive(s, (w) => ({
            ...w,
            members: w.members.filter((m) => m.id !== id),
          }))
        ),

      updateEtc: (text) =>
        set((s) => mutateActive(s, (w) => ({ ...w, etc: text }))),
    }),
    {
      name: "future-biz-dashboard",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

function mutateActive(s: State, fn: (w: Week) => Week): Partial<State> {
  return {
    weeks: s.weeks.map((w) => (w.id === s.activeWeekId ? fn(w) : w)),
  };
}

export const useActiveWeek = () =>
  useDashboardStore((s) => s.weeks.find((w) => w.id === s.activeWeekId) ?? s.weeks[0]);

export const useLeaderSuggestions = () =>
  useDashboardStore(
    useShallow((s) => {
      const set = new Set<string>();
      s.weeks.forEach((w) => {
        w.projects.forEach((p) => p.leader && set.add(p.leader));
        w.members.forEach((m) => m.role === "책임" && m.name && set.add(m.name));
      });
      return Array.from(set);
    })
  );
