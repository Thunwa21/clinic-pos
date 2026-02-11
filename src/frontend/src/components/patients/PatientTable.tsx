"use client";

import type { Patient } from "@/lib/types";

interface PatientTableProps {
  patients: Patient[];
  loading: boolean;
}

export default function PatientTable({ patients, loading }: PatientTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D1D5DB"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p className="mt-4 text-sm text-text-muted">No patients found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              #
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Name
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Phone
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Branch
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p, i) => (
            <tr
              key={p.id}
              className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors"
            >
              <td className="px-4 py-3 text-text-muted">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-text-primary">
                {p.firstName} {p.lastName}
              </td>
              <td className="px-4 py-3 font-mono text-text-secondary">
                {p.phoneNumber}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {p.primaryBranchId
                  ? p.primaryBranchId.substring(0, 8) + "..."
                  : "—"}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {new Date(p.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
