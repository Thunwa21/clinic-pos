import type { AuthSession } from "./types";

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem("token");
  if (!token) return null;
  return {
    token,
    username: sessionStorage.getItem("username") || "",
    role: sessionStorage.getItem("role") || "",
    tenantId: sessionStorage.getItem("tenantId") || "",
    tenantCode: sessionStorage.getItem("tenantCode") || "",
    tenantName: sessionStorage.getItem("tenantName") || "",
  };
}

export function setSession(data: AuthSession): void {
  sessionStorage.setItem("token", data.token);
  sessionStorage.setItem("username", data.username);
  sessionStorage.setItem("role", data.role);
  sessionStorage.setItem("tenantId", data.tenantId);
  sessionStorage.setItem("tenantCode", data.tenantCode);
  sessionStorage.setItem("tenantName", data.tenantName);
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
