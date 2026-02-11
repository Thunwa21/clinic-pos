import type { NavItem } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    label: "Patients",
    href: "/patients",
    icon: "patients",
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: "appointments",
    comingSoon: true,
  },
  {
    label: "Treatments",
    href: "/treatments",
    icon: "treatments",
    comingSoon: true,
  },
  {
    label: "Staff",
    href: "/staff",
    icon: "staff",
    comingSoon: true,
  },
];
