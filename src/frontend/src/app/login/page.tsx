"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface TenantOption {
  id: string;
  code: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/auth/tenants`)
      .then((res) => res.json())
      .then((data: TenantOption[]) => {
        setTenants(data);
        if (data.length > 0) setTenantCode(data[0].code);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, tenantCode }),
        });
        if (res.status === 409) {
          setError("Username already exists.");
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        setIsRegister(false);
        setError("");
        alert("Registered! You can now log in.");
        return;
      }

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, tenantCode }),
      });

      if (res.status === 401) {
        setError("Invalid username or password.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("username", data.username);
      sessionStorage.setItem("role", data.role);
      sessionStorage.setItem("tenantId", data.tenantId);
      sessionStorage.setItem("tenantCode", data.tenantCode);
      sessionStorage.setItem("tenantName", data.tenantName);

      router.push("/patients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-zinc-200 p-8 dark:border-zinc-800"
      >
        <h1 className="text-2xl font-bold mb-1">Clinic POS</h1>
        <p className="text-sm text-zinc-500 mb-6">
          {isRegister ? "Create a new account" : "Sign in to continue"}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tenant</label>
            {tenants.length > 0 ? (
              <select
                required
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {tenants.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="e.g. SKV"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-300"
        >
          {loading ? "..." : isRegister ? "Register" : "Sign In"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
          className="mt-3 w-full text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {isRegister
            ? "Already have an account? Sign in"
            : "Need an account? Register"}
        </button>
      </form>
    </div>
  );
}
