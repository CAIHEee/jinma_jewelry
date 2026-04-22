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

  function validateForm(): string | null {
    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedUsername) {
      return "请输入用户名。";
    }
    if (trimmedUsername.length < 2) {
      return "用户名至少 2 位。";
    }
    if (trimmedUsername.length > 64) {
      return "用户名不能超过 64 位。";
    }
    if (!password) {
      return "请输入密码。";
    }
    if (mode === "register") {
      if (password.length < 6) {
        return "密码至少 6 位。";
      }
      if (trimmedDisplayName.length > 128) {
        return "显示名不能超过 128 位。";
      }
      if (!confirmPassword) {
        return "请再次输入确认密码。";
      }
      if (password !== confirmPassword) {
        return "两次输入的密码不一致。";
      }
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setLocalError(null);
    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await onLogin(username.trim(), password);
      } else {
        await onRegister({
          username: username.trim(),
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
              <input
                className="search-input login-input"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder={mode === "login" ? "请输入用户名" : "注册后用于登录"}
                autoComplete="username"
                maxLength={64}
              />
            </label>
            {mode === "register" ? (
              <label className="input-group compact-input-group">
                <span>显示名</span>
                <input
                  className="search-input login-input"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="选填，用于页面展示"
                  autoComplete="nickname"
                  maxLength={128}
                />
              </label>
            ) : null}
            <label className="input-group compact-input-group">
              <span>密码</span>
              <input
                className="search-input login-input"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder={mode === "login" ? "请输入密码" : "至少 6 位"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
            {mode === "register" ? (
              <label className="input-group compact-input-group">
                <span>确认密码</span>
                <input
                  className="search-input login-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                />
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
                  setLocalError(null);
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
