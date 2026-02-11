import type { AuthSession, BranchInfo } from "./types";

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem("token");
  if (!token) return null;
  return {
    token,
    username: sessionStorage.getItem("username") || "",
    fullName: sessionStorage.getItem("fullName") || "",
    role: sessionStorage.getItem("role") || "",
    tenantId: sessionStorage.getItem("tenantId") || "",
    tenantCode: sessionStorage.getItem("tenantCode") || "",
    tenantName: sessionStorage.getItem("tenantName") || "",
    branches: JSON.parse(sessionStorage.getItem("branches") || "[]"),
    activeBranchId: sessionStorage.getItem("activeBranchId") || null,
  };
}

export function setSession(data: {
  token: string;
  username: string;
  fullName: string;
  role: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  branches: BranchInfo[];
}): void {
  sessionStorage.setItem("token", data.token);
  sessionStorage.setItem("username", data.username);
  sessionStorage.setItem("fullName", data.fullName);
  sessionStorage.setItem("role", data.role);
  sessionStorage.setItem("tenantId", data.tenantId);
  sessionStorage.setItem("tenantCode", data.tenantCode);
  sessionStorage.setItem("tenantName", data.tenantName);
  sessionStorage.setItem("branches", JSON.stringify(data.branches));
}

export function setActiveBranch(branchId: string): void {
  sessionStorage.setItem("activeBranchId", branchId);
}

export function getActiveBranch(): BranchInfo | null {
  if (typeof window === "undefined") return null;
  const session = getSession();
  if (!session || !session.activeBranchId) return null;
  return session.branches.find((b) => b.id === session.activeBranchId) || null;
}

export function clearSession(): void {
  sessionStorage.clear();
}

export function getAuthHeaders(): HeadersInit {
  const session = getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
  };
}

export function canCreatePatient(role: string): boolean {
  return role === "Admin" || role === "User";
}
