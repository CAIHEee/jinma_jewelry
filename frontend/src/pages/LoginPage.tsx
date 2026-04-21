import { useState, type FormEvent } from "react";

interface LoginPageProps {
  error: string | null;
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginPage({ error, onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="workspace login-shell">
      <div className="login-backdrop" aria-hidden="true">
        <div className="login-glow login-glow-left" />
        <div className="login-glow login-glow-right" />
        <div className="login-grid-pattern" />
      </div>
      <section className="login-stage">
        <div className="login-intro">
          <p className="eyebrow">JINMA AI DESIGN</p>
          <h1>金马珠宝设计台</h1>
          <p className="section-description">
            统一管理文生图、多图融合、线稿转写实图、多视图与资产沉淀。
          </p>
        </div>

        <section className="panel compact-panel login-panel">
          <div className="login-panel-header">
            <p className="eyebrow">JINMA AUTH</p>
            <h2>登录工作台</h2>
            <p className="section-description">使用账号密码进入系统。</p>
          </div>
          <form className="page-stack login-form" onSubmit={handleSubmit}>
            <label className="input-group compact-input-group">
              <span>用户名</span>
              <input className="search-input login-input" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" />
            </label>
            <label className="input-group compact-input-group">
              <span>密码</span>
              <input className="search-input login-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="secondary-button login-submit-button" type="submit" disabled={submitting}>
              {submitting ? "登录中..." : "登录"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
