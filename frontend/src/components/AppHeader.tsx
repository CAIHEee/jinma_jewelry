import { useEffect, useRef, useState } from "react";

import type { CurrentUser } from "../types/auth";

interface AppHeaderProps {
  title: string;
  currentUser: CurrentUser;
  onLogout: () => Promise<void> | void;
  onOpenNavigation?: () => void;
  showNavigationButton?: boolean;
}

export function AppHeader({ title, currentUser, onLogout, onOpenNavigation, showNavigationButton = false }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const displayName = currentUser.display_name || currentUser.username;
  const avatarText = displayName.trim().slice(0, 1).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-main">
        {showNavigationButton ? (
          <button
            className="topbar-nav-button"
            type="button"
            onClick={onOpenNavigation}
            aria-label="打开导航菜单"
            title="打开导航菜单"
          >
            <span />
            <span />
            <span />
          </button>
        ) : null}
        <div className="topbar-title-block">
          <p className="eyebrow">金马珠宝 AI 设计台</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="topbar-user-menu" ref={menuRef}>
          <button className={menuOpen ? "topbar-user-trigger open" : "topbar-user-trigger"} type="button" onClick={() => setMenuOpen((value) => !value)}>
            <span className="topbar-user-avatar" aria-hidden="true">
              {avatarText}
            </span>
            <span className="topbar-user-name">{displayName}</span>
          </button>

          {menuOpen ? (
            <div className="topbar-user-dropdown">
              <button
                className="topbar-user-dropdown-item"
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void onLogout();
                }}
              >
                退出登录
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
