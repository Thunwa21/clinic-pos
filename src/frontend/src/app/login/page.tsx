"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/constants";
import { setSession, getSession } from "@/lib/auth";
import type { TenantOption, LoginResponse } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

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
    const session = getSession();
    if (session) {
      router.push("/dashboard");
      return;
    }

    fetch(`${API_URL}/auth/tenants`)
      .then((res) => res.json())
      .then((data: TenantOption[]) => {
        setTenants(data);
        if (data.length > 0) setTenantCode(data[0].code);
      })
      .catch(() => {});
  }, [router]);

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

      const data: LoginResponse = await res.json();
      setSession(data);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const tenantOptions = tenants.map((t) => ({
    value: t.code,
    label: `${t.code} — ${t.name}`,
  }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-light">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Clinic POS</h1>
          <p className="mt-1 text-sm text-text-muted">Management System</p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-white p-8 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-sm text-text-muted mb-6">
            {isRegister
              ? "Register a new account to get started"
              : "Sign in to your account to continue"}
          </p>

          <div className="space-y-4">
            {tenantOptions.length > 0 ? (
              <Select
                label="Clinic"
                required
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                options={tenantOptions}
              />
            ) : (
              <Input
                label="Clinic Code"
                type="text"
                required
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                placeholder="e.g. SKV"
              />
            )}

            <Input
              label="Username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />

            <Input
              label="Password"
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-6 w-full"
          >
            {loading ? "Please wait..." : isRegister ? "Register" : "Sign In"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="mt-4 w-full text-center text-sm text-text-muted hover:text-primary transition-colors"
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Need an account? Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
