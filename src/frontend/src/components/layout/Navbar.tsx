"use client";

import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession, setActiveBranch } from "@/lib/auth";
import Badge from "@/components/ui/Badge";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/appointments": "Appointments",
  "/treatments": "Treatments",
  "/staff": "Staff",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();

  const title = pageTitles[pathname] || "Dashboard";

  const activeBranch = session?.branches.find(
    (b) => b.id === session.activeBranchId
  );

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "primary" as const;
      case "User":
        return "success" as const;
      case "Viewer":
        return "warning" as const;
      default:
        return "default" as const;
    }
  };

  function handleBranchChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setActiveBranch(e.target.value);
    window.location.reload();
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <header className="fixed left-[260px] right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-8">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>

      <div className="flex items-center gap-4">
        {/* Branch Selector */}
        {session && session.branches.length > 1 && (
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7A7A7A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <select
              value={session.activeBranchId || ""}
              onChange={handleBranchChange}
              className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {session.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Single branch — just show name */}
        {session && session.branches.length === 1 && activeBranch && (
          <div className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7A7A7A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm text-text-secondary">
              {activeBranch.name}
            </span>
          </div>
        )}

        {session && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">
                {session.fullName || session.username}
              </span>
              <Badge variant={roleBadgeVariant(session.role)}>
                {session.role}
              </Badge>
            </div>
            <div className="h-5 w-px bg-border" />
          </>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </header>
  );
}
