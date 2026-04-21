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
