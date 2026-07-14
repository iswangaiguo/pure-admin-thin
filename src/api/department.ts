import { http } from "@/utils/http";

export type StatusCode = 0 | 1;

export type DepartmentLeader = {
  id: number;
  username: string;
};

export type DepartmentRecord = {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  leaderId: number | null;
  leader: DepartmentLeader | null;
  sort: number;
  status: StatusCode;
  createdAt: string;
  updatedAt: string;
  children: DepartmentRecord[];
};

export type DepartmentOption = {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  children: DepartmentOption[];
  disabled?: boolean;
};

export type DepartmentFormData = {
  parentId?: number | null;
  name: string;
  code: string;
  leaderId?: number | null;
  sort: number;
  status: StatusCode;
};

export type DepartmentListParams = {
  name?: string;
  code?: string;
  status?: StatusCode | "";
};

type DepartmentTreeResult = { data: DepartmentRecord[] };
type DepartmentResult = { data: DepartmentRecord };
type LeaderCandidatesResult = { data: DepartmentLeader[] };

export const getDepartments = (params?: DepartmentListParams) =>
  http.request<DepartmentTreeResult>("get", "/api/v1/departments", {
    params
  });

export const createDepartment = (data: DepartmentFormData) =>
  http.request<DepartmentResult>("post", "/api/v1/departments", { data });

export const updateDepartment = (id: number, data: DepartmentFormData) =>
  http.request<DepartmentResult>("put", `/api/v1/departments/${id}`, {
    data
  });

export const deleteDepartment = (id: number) =>
  http.request("delete", `/api/v1/departments/${id}`);

export const getLeaderCandidates = (id: number) =>
  http.request<LeaderCandidatesResult>(
    "get",
    `/api/v1/departments/${id}/leader-candidates`
  );
