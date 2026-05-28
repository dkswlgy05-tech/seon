export type ProjectStatus = "개찰" | "진행중";

export type Project = {
  id: string;
  status: ProjectStatus;
  name: string;
  leader: string;
  submitDate: string;
  interviewDate: string;
  bidDate: string;
  fee: string;
  note: string;
};

export type UpcomingProject = {
  id: string;
  name: string;
  client: string;
  leader: string;
  budget: string;
  orderMonth: string;
  fee: string;
  note: string;
};

export type EducationRole = "책임" | "건축" | "토목" | "안전" | "기계";

export type EducationMember = {
  id: string;
  role: EducationRole;
  name: string;
  org: string;
};

export type Week = {
  id: string;
  label: string;
  projects: Project[];
  upcoming: UpcomingProject[];
  members: EducationMember[];
  etc: string;
};

export const EDUCATION_ROLES: EducationRole[] = [
  "책임",
  "건축",
  "토목",
  "안전",
  "기계",
];
