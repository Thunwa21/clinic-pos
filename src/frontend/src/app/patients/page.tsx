"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface Patient {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  primaryBranchId: string | null;
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [token, setToken] = useState("");
  const [tenantName, setTenantName] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    const t = sessionStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);
    setUsername(sessionStorage.getItem("username") || "");
    setRole(sessionStorage.getItem("role") || "");
    setTenantName(sessionStorage.getItem("tenantName") || "");
  }, [router]);

  useEffect(() => {
    if (token) fetchPatients();
  }, [token]);

  function authHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async function fetchPatients() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/patients`, {
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        sessionStorage.clear();
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPatients(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load patients"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      const res = await fetch(`${API_URL}/patients`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ firstName, lastName, phoneNumber }),
      });

      if (res.status === 401 || res.status === 403) {
        setFormError("You do not have permission to create patients.");
        return;
      }
      if (res.status === 409) {
        const data = await res.json();
        setFormError(data.error || "Duplicate phone number");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setFormSuccess("Patient created successfully!");
      setFirstName("");
      setLastName("");
      setPhoneNumber("");
      fetchPatients();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create patient"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    sessionStorage.clear();
    router.push("/login");
  }

  const canCreate = role === "Admin" || role === "User";

  if (!token) return null;

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patients</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Signed in as <span className="font-medium">{username}</span>{" "}
            <span className="inline-block rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium dark:bg-zinc-800">
              {role}
            </span>
            {tenantName && (
              <>
                {" "}
                <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {tenantName}
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Sign Out
        </button>
      </div>

      {/* --- Create Form (only for Admin/User) --- */}
      {canCreate ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
        >
          <h2 className="text-lg font-semibold mb-4">Add New Patient</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                maxLength={50}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="0812345678"
              />
            </div>
          </div>

          {formError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}
          {formSuccess && (
            <p className="mt-3 text-sm text-green-600 dark:text-green-400">
              {formSuccess}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-300"
          >
            {submitting ? "Creating..." : "Create Patient"}
          </button>
        </form>
      ) : (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          You have <strong>Viewer</strong> access. You can view patients but
          cannot create new ones.
        </div>
      )}

      {/* --- Patient List --- */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Patient List</h2>
          <button
            onClick={fetchPatients}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : patients.length === 0 ? (
          <p className="text-sm text-zinc-500">No patients found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Branch</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono">{p.phoneNumber}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {p.primaryBranchId
                        ? p.primaryBranchId.substring(0, 8) + "..."
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
