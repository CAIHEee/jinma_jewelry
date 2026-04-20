import { useState } from "react";

import { formatHistoryTimestamp } from "../utils/history";
import type { ModuleHistoryEntry } from "../utils/history";

interface PageGenerationHistoryProps {
  title: string;
  items: ModuleHistoryEntry[];
  activeId?: string | null;
  onPreview?: (item: ModuleHistoryEntry) => void;
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
}

export function PageGenerationHistory({ title, items, activeId, onPreview, onDeleteHistory }: PageGenerationHistoryProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);

  async function handleDelete(item: ModuleHistoryEntry) {
    if (item.source !== "persisted" || !item.persistedId || !onDeleteHistory) {
      return;
    }

    setDeletingHistoryId(item.persistedId);
    try {
      await onDeleteHistory(item.persistedId);
    } finally {
      setDeletingHistoryId(null);
    }
  }

  return (
    <aside className={collapsed ? "page-history-sidebar collapsed" : "page-history-sidebar"}>
      <div className="page-history-sidebar-header">
        {!collapsed ? (
          <div className="stack-list compact-stack">
            <h4>{title}</h4>
          </div>
        ) : (
          <span className="page-history-sidebar-mini-title">历史</span>
        )}

        <button
          className={collapsed ? "page-history-toggle-button collapsed" : "page-history-toggle-button"}
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "展开历史记录侧栏" : "收起历史记录侧栏"}
          title={collapsed ? "展开历史记录" : "收起历史记录"}
        >
          <span className="page-history-toggle-icon" aria-hidden="true">
            {collapsed ? ">" : "<"}
          </span>
          {!collapsed ? <span>收起</span> : null}
        </button>
      </div>

      <div className={items.length === 0 ? "page-history-sidebar-body page-history-sidebar-body-empty" : "page-history-sidebar-body"}>
        {items.length > 0 ? (
          <div className="page-history-sidebar-list">
            {items.map((item) => (
              <article
                className={item.id === activeId ? "page-history-card history-entry-card active" : "page-history-card history-entry-card"}
                key={item.id}
              >
                <button
                  className="page-history-card-button"
                  type="button"
                  onClick={() => onPreview?.(item)}
                  title={collapsed ? item.title : undefined}
                >
                  {item.imageUrl ? (
                    <div className="page-history-thumb history-preview-frame">
                      <img className="generated-image image-fit-contain" src={item.imageUrl} alt={item.title} />
                    </div>
                  ) : (
                    <span className="status-pill idle">{item.status}</span>
                  )}

                  {!collapsed ? (
                    <>
                      <div className="history-inline-head history-entry-head">
                        <h4>{item.title}</h4>
                      </div>
                      <div className="history-meta-row">
                        <span className="history-time-pill">{formatHistoryTimestamp(item.createdAt)}</span>
                        <p className="muted">{item.model} / {item.provider}</p>
                      </div>
                    </>
                  ) : null}
                </button>

                {!collapsed && item.source === "persisted" && item.persistedId ? (
                  <div className="page-history-card-actions">
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingHistoryId === item.persistedId}
                    >
                      {deletingHistoryId === item.persistedId ? "删除中..." : "删除记录"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={collapsed ? "panel-subcard compact page-history-empty-card collapsed" : "panel-subcard compact page-history-empty-card"}>
            <p className="muted">{collapsed ? "暂无" : "当前页面还没有生成记录。"}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
