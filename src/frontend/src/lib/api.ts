import { API_URL } from "./constants";
import { getAuthHeaders, clearSession } from "./auth";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers } = options;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: headers || getAuthHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 || res.status === 403) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized", res.status);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(
      data?.error || `HTTP ${res.status}`,
      res.status
    );
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}
