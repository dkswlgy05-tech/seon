"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  EducationMember,
  EducationRole,
  Project,
  ProjectStatus,
  UpcomingProject,
  Week,
} from "@/lib/types";
import {
  supabase,
  type DbMember,
  type DbProject,
  type DbUpcoming,
  type DbWeek,
} from "@/lib/supabase";

/* ------------ Row mappers (snake_case <-> camelCase) ------------ */

const mapProject = (r: DbProject): Project => ({
  id: r.id,
  status: r.status,
  name: r.name,
  leader: r.leader,
  submitDate: r.submit_date,
  interviewDate: r.interview_date,
  bidDate: r.bid_date,
  fee: r.fee,
  note: r.note,
});

const mapUpcoming = (r: DbUpcoming): UpcomingProject => ({
  id: r.id,
  name: r.name,
  client: r.client,
  leader: r.leader,
  budget: r.budget,
  orderMonth: r.order_month,
  fee: r.fee,
  note: r.note,
});

const mapMember = (r: DbMember): EducationMember => ({
  id: r.id,
  role: r.role,
  name: r.name,
  org: r.org,
});

const projectPatchToDb = (p: Partial<Project>): Partial<DbProject> => ({
  ...(p.status !== undefined && { status: p.status }),
  ...(p.name !== undefined && { name: p.name }),
  ...(p.leader !== undefined && { leader: p.leader }),
  ...(p.submitDate !== undefined && { submit_date: p.submitDate }),
  ...(p.interviewDate !== undefined && { interview_date: p.interviewDate }),
  ...(p.bidDate !== undefined && { bid_date: p.bidDate }),
  ...(p.fee !== undefined && { fee: p.fee }),
  ...(p.note !== undefined && { note: p.note }),
});

const upcomingPatchToDb = (
  u: Partial<UpcomingProject>
): Partial<DbUpcoming> => ({
  ...(u.name !== undefined && { name: u.name }),
  ...(u.client !== undefined && { client: u.client }),
  ...(u.leader !== undefined && { leader: u.leader }),
  ...(u.budget !== undefined && { budget: u.budget }),
  ...(u.orderMonth !== undefined && { order_month: u.orderMonth }),
  ...(u.fee !== undefined && { fee: u.fee }),
  ...(u.note !== undefined && { note: u.note }),
});

const memberPatchToDb = (m: Partial<EducationMember>): Partial<DbMember> => ({
  ...(m.role !== undefined && { role: m.role }),
  ...(m.name !== undefined && { name: m.name }),
  ...(m.org !== undefined && { org: m.org }),
});

/* ------------ Store ------------ */

type LoadStatus = "idle" | "loading" | "ready" | "error";

type State = {
  weeks: Week[];
  activeWeekId: string | null;
  status: LoadStatus;
  error: string | null;
};

type Actions = {
  init: () => Promise<void>;
  setActiveWeek: (id: string) => void;
  addWeek: (label: string) => Promise<void>;

  addProject: (status: ProjectStatus) => Promise<void>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addUpcoming: () => Promise<void>;
  updateUpcoming: (id: string, patch: Partial<UpcomingProject>) => Promise<void>;
  deleteUpcoming: (id: string) => Promise<void>;

  addMember: (role: EducationRole) => Promise<void>;
  updateMember: (id: string, patch: Partial<EducationMember>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;

  updateEtc: (text: string) => Promise<void>;
};

function mutateActive(s: State, fn: (w: Week) => Week): Partial<State> {
  if (!s.activeWeekId) return {};
  return {
    weeks: s.weeks.map((w) => (w.id === s.activeWeekId ? fn(w) : w)),
  };
}

function nextPos(items: { id: string }[]): number {
  return items.length;
}

export const useDashboardStore = create<State & Actions>()((set, get) => ({
  weeks: [],
  activeWeekId: null,
  status: "idle",
  error: null,

  init: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const [weeksRes, projectsRes, upcomingRes, membersRes] = await Promise.all([
        supabase.from("weeks").select("*").order("created_at", { ascending: true }),
        supabase.from("projects").select("*").order("position", { ascending: true }),
        supabase
          .from("upcoming_projects")
          .select("*")
          .order("position", { ascending: true }),
        supabase
          .from("education_members")
          .select("*")
          .order("position", { ascending: true }),
      ]);

      if (weeksRes.error) throw weeksRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (upcomingRes.error) throw upcomingRes.error;
      if (membersRes.error) throw membersRes.error;

      const projectsBy = groupBy(
        (projectsRes.data ?? []) as DbProject[],
        (r) => r.week_id
      );
      const upcomingBy = groupBy(
        (upcomingRes.data ?? []) as DbUpcoming[],
        (r) => r.week_id
      );
      const membersBy = groupBy(
        (membersRes.data ?? []) as DbMember[],
        (r) => r.week_id
      );

      const weeks: Week[] = ((weeksRes.data ?? []) as DbWeek[]).map((w) => ({
        id: w.id,
        label: w.label,
        etc: w.etc,
        projects: (projectsBy.get(w.id) ?? []).map(mapProject),
        upcoming: (upcomingBy.get(w.id) ?? []).map(mapUpcoming),
        members: (membersBy.get(w.id) ?? []).map(mapMember),
      }));

      set({
        weeks,
        activeWeekId: weeks.at(-1)?.id ?? null,
        status: "ready",
      });
    } catch (e) {
      console.error("[store] init failed", e);
      set({ status: "error", error: (e as Error).message });
    }
  },

  setActiveWeek: (id) => set({ activeWeekId: id }),

  addWeek: async (label) => {
    const prev = get().weeks.find((w) => w.id === get().activeWeekId);
    const { data, error } = await supabase
      .from("weeks")
      .insert({ label, etc: "" })
      .select("*")
      .single();
    if (error || !data) {
      console.error("[store] addWeek", error);
      return;
    }
    const newWeekId = (data as DbWeek).id;

    // Clone projects/members (not upcoming — upcoming carries less)
    if (prev) {
      const projInserts = prev.projects.map((p, i) => ({
        week_id: newWeekId,
        status: p.status,
        position: i,
        name: p.name,
        leader: p.leader,
        submit_date: p.submitDate,
        interview_date: p.interviewDate,
        bid_date: p.bidDate,
        fee: p.fee,
        note: p.note,
      }));
      const memInserts = prev.members.map((m, i) => ({
        week_id: newWeekId,
        role: m.role,
        position: i,
        name: m.name,
        org: m.org,
      }));
      if (projInserts.length)
        await supabase.from("projects").insert(projInserts);
      if (memInserts.length)
        await supabase.from("education_members").insert(memInserts);
    }
    // Refresh from server (simplest correct option for a clone)
    await refreshWeek(newWeekId, set, get);

    set((s) => ({
      activeWeekId: newWeekId,
      weeks: s.weeks, // already updated by refreshWeek
    }));
  },

  addProject: async (status) => {
    const weekId = get().activeWeekId;
    if (!weekId) return;
    const w = get().weeks.find((x) => x.id === weekId);
    if (!w) return;
    const position = nextPos(w.projects);
    const tempId = `tmp_${Math.random().toString(36).slice(2, 10)}`;
    const optimistic: Project = {
      id: tempId,
      status,
      name: "",
      leader: "",
      submitDate: "",
      interviewDate: "",
      bidDate: "",
      fee: "",
      note: "",
    };
    set((s) =>
      mutateActive(s, (ww) => ({ ...ww, projects: [...ww.projects, optimistic] }))
    );
    const { data, error } = await supabase
      .from("projects")
      .insert({
        week_id: weekId,
        status,
        position,
        name: "",
        leader: "",
        submit_date: "",
        interview_date: "",
        bid_date: "",
        fee: "",
        note: "",
      })
      .select("*")
      .single();
    if (error || !data) {
      console.error("[store] addProject", error);
      set((s) =>
        mutateActive(s, (ww) => ({
          ...ww,
          projects: ww.projects.filter((p) => p.id !== tempId),
        }))
      );
      return;
    }
    const real = mapProject(data as DbProject);
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        projects: ww.projects.map((p) => (p.id === tempId ? real : p)),
      }))
    );
  },

  updateProject: async (id, patch) => {
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        projects: ww.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }))
    );
    const { error } = await supabase
      .from("projects")
      .update(projectPatchToDb(patch))
      .eq("id", id);
    if (error) console.error("[store] updateProject", error);
  },

  deleteProject: async (id) => {
    const snapshot = get().weeks;
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        projects: ww.projects.filter((p) => p.id !== id),
      }))
    );
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      console.error("[store] deleteProject", error);
      set({ weeks: snapshot });
    }
  },

  addUpcoming: async () => {
    const weekId = get().activeWeekId;
    if (!weekId) return;
    const w = get().weeks.find((x) => x.id === weekId);
    if (!w) return;
    const position = nextPos(w.upcoming);
    const tempId = `tmp_${Math.random().toString(36).slice(2, 10)}`;
    const optimistic: UpcomingProject = {
      id: tempId,
      name: "",
      client: "",
      leader: "",
      budget: "",
      orderMonth: "",
      fee: "",
      note: "",
    };
    set((s) =>
      mutateActive(s, (ww) => ({ ...ww, upcoming: [...ww.upcoming, optimistic] }))
    );
    const { data, error } = await supabase
      .from("upcoming_projects")
      .insert({
        week_id: weekId,
        position,
        name: "",
        client: "",
        leader: "",
        budget: "",
        order_month: "",
        fee: "",
        note: "",
      })
      .select("*")
      .single();
    if (error || !data) {
      console.error("[store] addUpcoming", error);
      set((s) =>
        mutateActive(s, (ww) => ({
          ...ww,
          upcoming: ww.upcoming.filter((u) => u.id !== tempId),
        }))
      );
      return;
    }
    const real = mapUpcoming(data as DbUpcoming);
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        upcoming: ww.upcoming.map((u) => (u.id === tempId ? real : u)),
      }))
    );
  },

  updateUpcoming: async (id, patch) => {
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        upcoming: ww.upcoming.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }))
    );
    const { error } = await supabase
      .from("upcoming_projects")
      .update(upcomingPatchToDb(patch))
      .eq("id", id);
    if (error) console.error("[store] updateUpcoming", error);
  },

  deleteUpcoming: async (id) => {
    const snapshot = get().weeks;
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        upcoming: ww.upcoming.filter((u) => u.id !== id),
      }))
    );
    const { error } = await supabase
      .from("upcoming_projects")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[store] deleteUpcoming", error);
      set({ weeks: snapshot });
    }
  },

  addMember: async (role) => {
    const weekId = get().activeWeekId;
    if (!weekId) return;
    const w = get().weeks.find((x) => x.id === weekId);
    if (!w) return;
    const position = nextPos(w.members.filter((m) => m.role === role));
    const tempId = `tmp_${Math.random().toString(36).slice(2, 10)}`;
    const optimistic: EducationMember = { id: tempId, role, name: "", org: "" };
    set((s) =>
      mutateActive(s, (ww) => ({ ...ww, members: [...ww.members, optimistic] }))
    );
    const { data, error } = await supabase
      .from("education_members")
      .insert({ week_id: weekId, role, position, name: "", org: "" })
      .select("*")
      .single();
    if (error || !data) {
      console.error("[store] addMember", error);
      set((s) =>
        mutateActive(s, (ww) => ({
          ...ww,
          members: ww.members.filter((m) => m.id !== tempId),
        }))
      );
      return;
    }
    const real = mapMember(data as DbMember);
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        members: ww.members.map((m) => (m.id === tempId ? real : m)),
      }))
    );
  },

  updateMember: async (id, patch) => {
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        members: ww.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }))
    );
    const { error } = await supabase
      .from("education_members")
      .update(memberPatchToDb(patch))
      .eq("id", id);
    if (error) console.error("[store] updateMember", error);
  },

  deleteMember: async (id) => {
    const snapshot = get().weeks;
    set((s) =>
      mutateActive(s, (ww) => ({
        ...ww,
        members: ww.members.filter((m) => m.id !== id),
      }))
    );
    const { error } = await supabase
      .from("education_members")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[store] deleteMember", error);
      set({ weeks: snapshot });
    }
  },

  updateEtc: async (text) => {
    const weekId = get().activeWeekId;
    if (!weekId) return;
    set((s) => mutateActive(s, (ww) => ({ ...ww, etc: text })));
    const { error } = await supabase
      .from("weeks")
      .update({ etc: text })
      .eq("id", weekId);
    if (error) console.error("[store] updateEtc", error);
  },
}));

async function refreshWeek(
  weekId: string,
  set: (
    fn:
      | Partial<State>
      | ((s: State & Actions) => Partial<State & Actions>)
  ) => void,
  get: () => State & Actions
) {
  const [wRes, pRes, uRes, mRes] = await Promise.all([
    supabase.from("weeks").select("*").eq("id", weekId).single(),
    supabase
      .from("projects")
      .select("*")
      .eq("week_id", weekId)
      .order("position", { ascending: true }),
    supabase
      .from("upcoming_projects")
      .select("*")
      .eq("week_id", weekId)
      .order("position", { ascending: true }),
    supabase
      .from("education_members")
      .select("*")
      .eq("week_id", weekId)
      .order("position", { ascending: true }),
  ]);
  if (wRes.error || !wRes.data) return;
  const w = wRes.data as DbWeek;
  const week: Week = {
    id: w.id,
    label: w.label,
    etc: w.etc,
    projects: ((pRes.data ?? []) as DbProject[]).map(mapProject),
    upcoming: ((uRes.data ?? []) as DbUpcoming[]).map(mapUpcoming),
    members: ((mRes.data ?? []) as DbMember[]).map(mapMember),
  };
  const existing = get().weeks.some((x) => x.id === weekId);
  set({
    weeks: existing
      ? get().weeks.map((x) => (x.id === weekId ? week : x))
      : [...get().weeks, week],
  });
}

function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  arr.forEach((item) => {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(item);
  });
  return m;
}

/* ------------ Selectors ------------ */

export const useActiveWeek = () =>
  useDashboardStore((s) =>
    s.activeWeekId ? s.weeks.find((w) => w.id === s.activeWeekId) ?? null : null
  );

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
