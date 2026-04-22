import { useMemo, useState } from "react";

import { ResultPreviewModal } from "../components/ResultPreviewModal";
import type { PersistedHistoryItem } from "../types/history";
import type { WorkspaceRun } from "../types/workspace";
import { appendSecondSuffixToName, buildDownloadFilename, buildDownloadUrl } from "../utils/download";
import { formatHistoryTimestamp, getHistoryKindLabel, mergeModuleHistory, type ModuleHistoryEntry } from "../utils/history";

interface HistoryPageProps {
  workspaceRuns: WorkspaceRun[];
  persistedItems: PersistedHistoryItem[];
  persistedError: string | null;
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
}

interface PreviewState {
  title: string;
  sourceUrl?: string | null;
  resultUrl?: string | null;
  sourceLabel?: string;
  resultLabel?: string;
}

const filterTags = ["全部", "文生图", "多图融合", "线稿转写实图", "产品精修", "裸石设计", "高清放大", "生成多视图", "多视图切图", "转灰度图"];

export function HistoryPage({ workspaceRuns, persistedItems, persistedError, onDeleteHistory }: HistoryPageProps) {
  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);

  const normalizedKeyword = keyword.trim().toLowerCase();

  const operationItems = useMemo(
    () =>
      [
        ...mergeModuleHistory(persistedItems, workspaceRuns, "text_to_image"),
        ...mergeModuleHistory(persistedItems, workspaceRuns, "fusion"),
        ...mergeModuleHistory(persistedItems, workspaceRuns, "sketch_to_realistic"),
        ...mergeModuleHistory(persistedItems, workspaceRuns, "product_refine"),
        ...mergeModuleHistory(persistedItems, workspaceRuns, "gemstone_design"),
        ...mergeModuleHistory(persistedItems, workspaceRuns, "upscale"),
        ...mergeModuleHistory(persistedItems, workspaceRuns, "multi_view"),
        ...mergeModuleHistory(persistedItems, workspaceRuns, "multi_view_split"),
        ...mergeModuleHistory(persistedItems, workspaceRuns, "grayscale_relief"),
      ]
        .filter((item) => {
          const moduleLabel = getHistoryKindLabel(item.kind);
          const filterMatched = activeFilter === "全部" || moduleLabel === activeFilter;
          const searchable = `${item.title} ${item.model} ${item.provider} ${item.prompt}`.toLowerCase();
          return filterMatched && (!normalizedKeyword || searchable.includes(normalizedKeyword));
        })
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [activeFilter, normalizedKeyword, persistedItems, workspaceRuns],
  );

  function openOperationPreview(item: ModuleHistoryEntry) {
    setPreviewState({
      title: item.title,
      sourceUrl: item.sourceImages[item.primaryImageIndex ?? 0] ?? item.sourceImageUrl ?? item.sourceImages[0] ?? null,
      resultUrl: item.imageUrl,
      sourceLabel: "原始图",
      resultLabel: "结果图",
    });
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

  function resolveHistoryDownloadName(item: ModuleHistoryEntry): string {
    return appendSecondSuffixToName(item.title, item.createdAt);
  }

  return (
    <div className="page-stack compact-page">
      <section className="panel compact-panel">
        <div className="history-toolbar">
          <div className="toolbar">
            <div className="tag-row">
              {filterTags.map((tag) => (
                <button
                  className={tag === activeFilter ? "filter-chip active" : "filter-chip"}
                  type="button"
                  key={tag}
                  onClick={() => setActiveFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <input
              className="search-input"
              placeholder="按任务名、模型或提示词搜索..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel compact-panel">
        <div className="history-section-head">
          <div>
            <h3>全部操作记录</h3>
            <p className="section-description">当前会话和持久化记录已自动合并，并按时间倒序展示。</p>
          </div>
          <span className="status-pill online">{operationItems.length} 条</span>
        </div>

        {persistedError ? <p className="error-text">{persistedError}</p> : null}

        {operationItems.length > 0 ? (
          <div className="session-run-list">
            {operationItems.map((item) => (
              <details className="drawer-panel history-drawer unified-history-drawer" key={item.id} open>
                <summary className="drawer-summary">
                  <div className="session-run-copy history-entry-copy">
                    <div className="history-inline-head">
                      <h4>{item.title}</h4>
                      <span className="history-module-pill">{getHistoryKindLabel(item.kind)}</span>
                    </div>
                    <p>
                      {item.provider} / {item.model} / {formatHistoryTimestamp(item.createdAt)}
                    </p>
                    {"ownerUsername" in item && item.ownerUsername ? <p>归属: {item.ownerUsername}</p> : null}
                  </div>
                </summary>
                <div className="drawer-content">
                  <p className="muted">{item.prompt}</p>
                  {item.imageUrl ? (
                    <>
                      <button
                        className="generated-result-card history-result-card history-preview-frame compact-history-preview history-preview-button"
                        type="button"
                        onClick={() => openOperationPreview(item)}
                      >
                        <img className="generated-image image-fit-contain" src={item.imageUrl} alt={item.title} />
                      </button>
                      <div className="inline-action-row">
                        <a
                          className="secondary-button"
                          href={buildDownloadUrl(item.imageUrl, buildDownloadFilename(resolveHistoryDownloadName(item), item.imageUrl)) ?? item.imageUrl}
                          download={buildDownloadFilename(resolveHistoryDownloadName(item), item.imageUrl)}
                        >
                          下载图片
                        </a>
                        {item.source === "persisted" && item.persistedId ? (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => void handleDelete(item)}
                            disabled={deletingHistoryId === item.persistedId}
                          >
                            {deletingHistoryId === item.persistedId ? "删除中..." : "删除记录"}
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="inline-action-row">
                      <span className="status-pill idle">{item.status}</span>
                      {item.source === "persisted" && item.persistedId ? (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={deletingHistoryId === item.persistedId}
                        >
                          {deletingHistoryId === item.persistedId ? "删除中..." : "删除记录"}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="panel-subcard">
            <p className="muted">当前筛选条件下没有操作记录。</p>
          </div>
        )}
      </section>

      {previewState ? (
        <ResultPreviewModal
          title={previewState.title}
          sourceUrl={previewState.sourceUrl}
          sourceLabel={previewState.sourceLabel}
          resultUrl={previewState.resultUrl}
          resultLabel={previewState.resultLabel}
          onClose={() => setPreviewState(null)}
        />
      ) : null}
    </div>
  );
}
