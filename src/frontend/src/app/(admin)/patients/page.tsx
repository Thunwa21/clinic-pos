"use client";

import { useState, useEffect, useMemo } from "react";
import { getSession } from "@/lib/auth";
import { canCreatePatient } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { Patient, BranchInfo } from "@/lib/types";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PatientTable from "@/components/patients/PatientTable";
import PatientFormModal from "@/components/patients/PatientFormModal";

export default function PatientsPage() {
  const session = getSession();
  const branches: BranchInfo[] = session?.branches || [];

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function fetchPatients(branchId?: string) {
    setLoading(true);
    setError("");
    try {
      const query = branchId ? `?branchId=${branchId}` : "";
      const data = await apiFetch<Patient[]>(`/patients${query}`);
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPatients(branchFilter || undefined);
  }, [branchFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.phoneNumber.includes(q) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const showAdd = session && canCreatePatient(session.role);

  const branchFilterOptions = [
    { value: "", label: "All Branches" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Patients</h1>
          <p className="mt-1 text-sm text-text-muted">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} total
          </p>
        </div>
        {showAdd && (
          <Button onClick={() => setModalOpen(true)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Patient
          </Button>
        )}
      </div>

      {!showAdd && session?.role === "Viewer" && (
        <div className="mb-6 rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm text-warning">
          You have <strong>Viewer</strong> access. You can view patients but
          cannot create new ones.
        </div>
      )}

      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {branches.length > 0 && (
            <Select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={branchFilterOptions}
              className="max-w-[200px]"
            />
          )}
        </div>

        {error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => fetchPatients(branchFilter || undefined)}
            >
              Retry
            </Button>
          </div>
        ) : (
          <PatientTable
            patients={filtered}
            branches={branches}
            loading={loading}
          />
        )}
      </Card>

      {showAdd && (
        <PatientFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            fetchPatients(branchFilter || undefined);
          }}
        />
      )}
    </div>
  );
}
