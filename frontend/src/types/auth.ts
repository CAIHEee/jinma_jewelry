export interface ModulePermissionItem {
  module_key: string;
  label: string;
  is_enabled: boolean;
}

export interface CurrentUser {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: "root" | "user";
  is_disabled: boolean;
  permissions: ModulePermissionItem[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: CurrentUser;
}
