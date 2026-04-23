import type { ModulePermissionItem } from "./auth";

export interface AdminUser {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: string;
  is_disabled: boolean;
  created_at: string;
  permissions: ModulePermissionItem[];
}

export interface AdminUserListResponse {
  items: AdminUser[];
}

export interface AdminSystemStatus {
  backend_status: string;
  database_status: string;
  storage_mode: string;
  storage_path: string;
  oss_compat_enabled: boolean;
  environment: string;
}
