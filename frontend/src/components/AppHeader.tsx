interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">金马珠宝 AI 设计台</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <div className="status-pill online">后端已连接</div>
        <div className="status-pill warning">OSS 已配置</div>
      </div>
    </header>
  );
}
