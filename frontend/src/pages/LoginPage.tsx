import { useState, type FormEvent } from "react";

interface LoginPageProps {
  error: string | null;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (payload: { username: string; password: string; displayName?: string }) => Promise<void>;
}

type AuthMode = "login" | "register";

export function LoginPage({ error, onLogin, onRegister }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (mode === "register") {
      if (password !== confirmPassword) {
        setLocalError("两次输入的密码不一致。");
        return;
      }
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await onLogin(username, password);
      } else {
        await onRegister({
          username,
          password,
          displayName: displayName.trim() || undefined,
        });
      }
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
            <h2>{mode === "login" ? "登录工作台" : "注册新账号"}</h2>
            {mode === "login" ? <p className="section-description">使用账号密码进入系统。</p> : null}
          </div>
          <form className="page-stack login-form" onSubmit={handleSubmit}>
            <label className="input-group compact-input-group">
              <span>用户名</span>
              <input className="search-input login-input" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={mode === "login" ? "请输入用户名" : "注册后用于登录"} />
            </label>
            {mode === "register" ? (
              <label className="input-group compact-input-group">
                <span>显示名</span>
                <input className="search-input login-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="选填，用于页面展示" />
              </label>
            ) : null}
            <label className="input-group compact-input-group">
              <span>密码</span>
              <input className="search-input login-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "login" ? "请输入密码" : "至少 6 位"} />
            </label>
            {mode === "register" ? (
              <label className="input-group compact-input-group">
                <span>确认密码</span>
                <input className="search-input login-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="请再次输入密码" />
              </label>
            ) : null}
            {localError ? <p className="error-text">{localError}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
            <button className="secondary-button login-submit-button" type="submit" disabled={submitting}>
              {submitting ? (mode === "login" ? "登录中..." : "注册中...") : mode === "login" ? "登录" : "注册并进入"}
            </button>
            <div className="login-mode-footer" role="tablist" aria-label="登录注册切换">
              <span className="login-mode-footer-label">{mode === "login" ? "还没有账号？" : "已有账号？"}</span>
              <button
                className="login-mode-footer-button"
                type="button"
                onClick={() => {
                  const nextMode = mode === "login" ? "register" : "login";
                  setMode(nextMode);
                  if (nextMode === "register" && username === "root") {
                    setUsername("");
                  }
                }}
              >
                {mode === "login" ? "去注册" : "返回登录"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
