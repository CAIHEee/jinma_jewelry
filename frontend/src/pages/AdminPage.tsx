import { useMemo, useState } from "react";

import { SectionHeader } from "../components/SectionHeader";
import type { AdminUser } from "../types/admin";
import type { ModulePermissionItem } from "../types/auth";

interface AdminPageProps {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onCreateUser: (payload: { username: string; display_name?: string; email?: string; password: string }) => Promise<void>;
  onToggleDisabled: (user: AdminUser) => Promise<void>;
  onResetPassword: (user: AdminUser, password: string) => Promise<void>;
  onSavePermissions: (user: AdminUser, permissions: ModulePermissionItem[]) => Promise<void>;
  onUploadCommunityAsset: (file: File, moduleKind: string) => Promise<void>;
}

export function AdminPage({
  users,
  loading,
  error,
  onRefresh,
  onCreateUser,
  onToggleDisabled,
  onResetPassword,
  onSavePermissions,
  onUploadCommunityAsset,
}: AdminPageProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, boolean>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [createForm, setCreateForm] = useState({ username: "", display_name: "", email: "", password: "" });

  const selectedUser = useMemo(() => users.find((item) => item.id === selectedUserId) ?? users[0] ?? null, [selectedUserId, users]);

  function syncPermissions(user: AdminUser | null) {
    if (!user) return;
    setSelectedUserId(user.id);
    setDraftPermissions(Object.fromEntries(user.permissions.map((item) => [item.module_key, item.is_enabled])));
  }

  return (
    <div className="page-stack compact-page">
      <section className="panel compact-panel">
        <SectionHeader eyebrow="Root" title="用户与权限管理" description="创建用户、启停用账号、重置密码并配置模块开关。" />
        <div className="inline-action-row">
          <button className="secondary-button compact-button" type="button" onClick={() => void onRefresh()} disabled={loading}>
            {loading ? "刷新中..." : "刷新列表"}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="panel compact-panel">
        <SectionHeader eyebrow="新用户" title="创建账号" description="新用户默认不启用任何模块权限，需由 root 手动授权。" />
        <div className="toolbar">
          <input className="search-input" placeholder="用户名" value={createForm.username} onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))} />
          <input className="search-input" placeholder="显示名" value={createForm.display_name} onChange={(event) => setCreateForm((current) => ({ ...current, display_name: event.target.value }))} />
          <input className="search-input" placeholder="邮箱" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} />
          <input className="search-input" placeholder="初始密码" type="password" value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} />
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={() => void onCreateUser(createForm)}
            disabled={!createForm.username || !createForm.password}
          >
            创建用户
          </button>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel compact-panel">
          <SectionHeader eyebrow="用户" title="账号列表" description="点击用户后可调整模块权限。" />
          <div className="task-list">
            {users.map((user) => (
              <article className="task-card" key={user.id}>
                <div>
                  <h4>{user.display_name || user.username}</h4>
                  <p>{user.username} / {user.role} / {user.is_disabled ? "已停用" : "启用中"}</p>
                </div>
                <div className="inline-action-row">
                  <button className="secondary-button compact-button" type="button" onClick={() => syncPermissions(user)}>
                    配置权限
                  </button>
                  {user.role !== "root" ? (
                    <button className="secondary-button compact-button" type="button" onClick={() => void onToggleDisabled(user)}>
                      {user.is_disabled ? "启用" : "停用"}
                    </button>
                  ) : null}
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={() => {
                      const password = window.prompt(`为 ${user.username} 设置新密码`);
                      if (password) {
                        void onResetPassword(user, password);
                      }
                    }}
                  >
                    重置密码
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel compact-panel">
          <SectionHeader eyebrow="权限" title={selectedUser ? `模块权限: ${selectedUser.username}` : "模块权限"} description="root 默认全开，普通用户按模块开关。" />
          {selectedUser ? (
            <>
              <div className="guide-list">
                {selectedUser.permissions.map((permission) => (
                  <label className="guide-step" key={permission.module_key}>
                    <input
                      type="checkbox"
                      checked={selectedUser.role === "root" ? true : Boolean(draftPermissions[permission.module_key])}
                      disabled={selectedUser.role === "root"}
                      onChange={(event) =>
                        setDraftPermissions((current) => ({ ...current, [permission.module_key]: event.target.checked }))
                      }
                    />
                    <div>
                      <h4>{permission.label}</h4>
                      <p>{permission.module_key}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="inline-action-row">
                <button
                  className="secondary-button compact-button"
                  type="button"
                  disabled={selectedUser.role === "root"}
                  onClick={() =>
                    void onSavePermissions(
                      selectedUser,
                      selectedUser.permissions.map((permission) => ({
                        ...permission,
                        is_enabled: Boolean(draftPermissions[permission.module_key]),
                      })),
                    )
                  }
                >
                  保存权限
                </button>
              </div>
            </>
          ) : (
            <p className="muted">暂无用户。</p>
          )}
        </section>
      </div>

      <section className="panel compact-panel">
        <SectionHeader eyebrow="社区资产" title="上传社区资产" description="root 可直接向社区资产池上传素材。" />
        <div className="inline-action-row">
          <input type="file" accept="image/*" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
          <button
            className="secondary-button compact-button"
            type="button"
            disabled={!uploadFile}
            onClick={() => uploadFile && void onUploadCommunityAsset(uploadFile, "asset_management")}
          >
            上传到社区
          </button>
        </div>
      </section>
    </div>
  );
}
