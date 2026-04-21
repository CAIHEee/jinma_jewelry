import type { CurrentUser } from "../types/auth";

interface AppHeaderProps {
  title: string;
  currentUser: CurrentUser;
  onLogout: () => Promise<void> | void;
}

export function AppHeader({ title, currentUser, onLogout }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">金马珠宝 AI 设计台</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <div className="status-pill online">后端已连接</div>
        <div className="status-pill warning">OSS 已配置</div>
        <div className="status-pill idle">{currentUser.role === "root" ? "ROOT" : "USER"}</div>
        <div className="status-pill">{currentUser.display_name || currentUser.username}</div>
        <button className="secondary-button compact-button" type="button" onClick={() => void onLogout()}>
          退出登录
        </button>
      </div>
    </header>
  );
}
