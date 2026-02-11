"use client";

import { useState, useEffect, useMemo } from "react";
import { getSession } from "@/lib/auth";
import { canCreatePatient } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { Patient } from "@/lib/types";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PatientTable from "@/components/patients/PatientTable";
import PatientFormModal from "@/components/patients/PatientFormModal";

export default function PatientsPage() {
  const session = getSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function fetchPatients() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<Patient[]>("/patients");
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPatients();
  }, []);

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
        <div className="border-b border-border p-4">
          <SearchInput
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="secondary" className="mt-3" onClick={fetchPatients}>
              Retry
            </Button>
          </div>
        ) : (
          <PatientTable patients={filtered} loading={loading} />
        )}
      </Card>

      {showAdd && (
        <PatientFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            fetchPatients();
          }}
        />
      )}
    </div>
  );
}
