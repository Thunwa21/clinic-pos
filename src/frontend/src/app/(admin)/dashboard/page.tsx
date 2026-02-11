"use client";

import { useState, useEffect } from "react";
import { getSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Card from "@/components/ui/Card";
import type { Patient } from "@/lib/types";

export default function DashboardPage() {
  const session = getSession();
  const [patientCount, setPatientCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<Patient[]>("/patients")
      .then((data) => setPatientCount(data.length))
      .catch(() => setPatientCount(0));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome back, {session?.username}
        </h1>
        <p className="mt-1 text-text-muted">
          Here&apos;s an overview of your clinic
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Patients */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00B6D6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-muted">Total Patients</p>
              <p className="text-2xl font-bold text-text-primary">
                {patientCount !== null ? patientCount : "..."}
              </p>
            </div>
          </div>
        </Card>

        {/* Coming Soon Cards */}
        <Card className="opacity-60">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7A7A7A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-muted">Appointments</p>
              <p className="text-sm font-medium text-text-muted">Coming Soon</p>
            </div>
          </div>
        </Card>

        <Card className="opacity-60">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7A7A7A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-muted">Treatments</p>
              <p className="text-sm font-medium text-text-muted">Coming Soon</p>
            </div>
          </div>
        </Card>

        <Card className="opacity-60">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7A7A7A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-muted">Staff</p>
              <p className="text-sm font-medium text-text-muted">Coming Soon</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
