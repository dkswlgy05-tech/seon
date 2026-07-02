import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env. " +
      "Copy .env.example to .env.local and fill in your project values."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

/* DB row shapes (snake_case as stored in Postgres). */

export type DbWeek = {
  id: string;
  label: string;
  etc: string;
  created_at: string;
};

export type DbProject = {
  id: string;
  week_id: string;
  status: "개찰" | "진행중";
  position: number;
  name: string;
  leader: string;
  submit_date: string;
  interview_date: string;
  bid_date: string;
  fee: string;
  note: string;
};

export type DbUpcoming = {
  id: string;
  week_id: string;
  position: number;
  name: string;
  client: string;
  leader: string;
  budget: string;
  order_month: string;
  fee: string;
  note: string;
};

export type DbMember = {
  id: string;
  week_id: string;
  role: "책임" | "건축" | "토목" | "안전" | "기계";
  position: number;
  name: string;
  org: string;
};
