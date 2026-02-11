export interface Patient {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  primaryBranchId: string | null;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
}

export interface AuthSession {
  token: string;
  username: string;
  role: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
}

export interface TenantOption {
  id: string;
  code: string;
  name: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
}
