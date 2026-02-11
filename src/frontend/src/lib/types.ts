export interface Patient {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  primaryBranchId: string | null;
  createdAt: string;
}

export interface BranchInfo {
  id: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  fullName: string;
  role: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  branches: BranchInfo[];
}

export interface AuthSession {
  token: string;
  username: string;
  fullName: string;
  role: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  branches: BranchInfo[];
  activeBranchId: string | null;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
}
