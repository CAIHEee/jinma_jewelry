import { useState } from "react";

import { appendSecondSuffixToName, buildDownloadFilename, buildDownloadUrl } from "../utils/download";
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

  function resolveDisplayTitle(item: ModuleHistoryEntry): string {
    return appendSecondSuffixToName(item.title, item.createdAt);
  }

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
                  title={collapsed ? resolveDisplayTitle(item) : undefined}
                >
                  {item.imageUrl ? (
                    <div className="page-history-thumb history-preview-frame">
                      <img className="generated-image image-fit-contain" src={item.imageUrl} alt={resolveDisplayTitle(item)} />
                    </div>
                  ) : (
                    <span className="status-pill idle">{item.status}</span>
                  )}

                  {!collapsed ? (
                    <>
                      <div className="history-inline-head history-entry-head">
                        <h4>{resolveDisplayTitle(item)}</h4>
                      </div>
                      <div className="history-meta-row">
                        <span className="history-time-pill">{formatHistoryTimestamp(item.createdAt)}</span>
                        <p className="muted">{item.model} / {item.provider}</p>
                      </div>
                    </>
                  ) : null}
                </button>

                {!collapsed && onDeleteHistory && item.source === "persisted" && item.persistedId ? (
                  <div className="page-history-card-actions">
                    {item.imageUrl ? (
                      <a
                        className="history-icon-button"
                        href={buildDownloadUrl(item.imageUrl, buildDownloadFilename(resolveDisplayTitle(item), item.imageUrl)) ?? item.imageUrl}
                        download={buildDownloadFilename(resolveDisplayTitle(item), item.imageUrl)}
                        title="下载图片"
                        aria-label="下载图片"
                      >
                        <span aria-hidden="true">↓</span>
                      </a>
                    ) : null}
                    <button
                      className="history-icon-button"
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingHistoryId === item.persistedId}
                      title={deletingHistoryId === item.persistedId ? "删除中" : "删除记录"}
                      aria-label={deletingHistoryId === item.persistedId ? "删除中" : "删除记录"}
                    >
                      <span aria-hidden="true">{deletingHistoryId === item.persistedId ? "…" : "×"}</span>
                    </button>
                  </div>
                ) : !collapsed && item.imageUrl ? (
                  <div className="page-history-card-actions">
                    <a
                      className="history-icon-button"
                      href={buildDownloadUrl(item.imageUrl, buildDownloadFilename(resolveDisplayTitle(item), item.imageUrl)) ?? item.imageUrl}
                      download={buildDownloadFilename(resolveDisplayTitle(item), item.imageUrl)}
                      title="下载图片"
                      aria-label="下载图片"
                    >
                      <span aria-hidden="true">↓</span>
                    </a>
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
