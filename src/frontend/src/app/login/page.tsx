"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/constants";
import { setSession, setActiveBranch, getSession } from "@/lib/auth";
import type { LoginResponse, BranchInfo } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

type Step = "login" | "select-branch";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");

  // Login fields
  const [tenantCode, setTenantCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Branch selection
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  useEffect(() => {
    const session = getSession();
    if (session?.activeBranchId) {
      router.push("/dashboard");
    }
  }, [router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          tenantCode: tenantCode.toUpperCase(),
        }),
      });

      if (res.status === 401) {
        setError("Invalid username or password.");
        return;
      }
      if (res.status === 400) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Invalid tenant code.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const data: LoginResponse = await res.json();

      setSession({
        token: data.token,
        username: data.username,
        fullName: data.fullName,
        role: data.role,
        tenantId: data.tenantId,
        tenantCode: data.tenantCode,
        tenantName: data.tenantName,
        branches: data.branches,
      });

      if (data.branches.length === 0) {
        // No branches assigned — go straight to dashboard
        router.push("/dashboard");
      } else if (data.branches.length === 1) {
        // Auto-select single branch
        setActiveBranch(data.branches[0].id);
        router.push("/dashboard");
      } else {
        // Multiple branches — let user pick
        setBranches(data.branches);
        setSelectedBranchId(data.branches[0].id);
        setStep("select-branch");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectBranch(e: FormEvent) {
    e.preventDefault();
    if (!selectedBranchId) return;
    setActiveBranch(selectedBranchId);
    router.push("/dashboard");
  }

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

        {/* Login Step */}
        {step === "login" && (
          <form
            onSubmit={handleLogin}
            className="rounded-2xl border border-border bg-white p-8 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Welcome Back
            </h2>
            <p className="text-sm text-text-muted mb-6">
              Sign in to your account to continue
            </p>

            <div className="space-y-4">
              <Input
                label="Clinic Code"
                type="text"
                required
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                placeholder="e.g. AURA"
              />

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

            <Button type="submit" disabled={loading} className="mt-6 w-full">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        )}

        {/* Branch Selection Step */}
        {step === "select-branch" && (
          <form
            onSubmit={handleSelectBranch}
            className="rounded-2xl border border-border bg-white p-8 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Select Branch
            </h2>
            <p className="text-sm text-text-muted mb-6">
              Choose the branch you want to work in
            </p>

            <Select
              label="Branch"
              required
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              options={branches.map((b) => ({
                value: b.id,
                label: b.name,
              }))}
            />

            <Button type="submit" className="mt-6 w-full">
              Continue
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("login");
                setError("");
              }}
              className="mt-4 w-full text-center text-sm text-text-muted hover:text-primary transition-colors"
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
