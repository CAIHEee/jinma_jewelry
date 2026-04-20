import { useMemo, useState } from "react";

import { ResultPreviewModal } from "../components/ResultPreviewModal";
import { SectionHeader } from "../components/SectionHeader";
import type { AssetItem, TaskSummary, WorkflowStage, WorkflowStat } from "../types/mockData";
import { buildDownloadFilename, buildDownloadUrl } from "../utils/download";

interface AssetManagementPageProps {
  assetItems: AssetItem[];
  workflowStats: WorkflowStat[];
  stages: WorkflowStage[];
  tasks: TaskSummary[];
  assetError?: string | null;
  onDeleteAsset?: (assetId: string) => Promise<void> | void;
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
}

interface AssetPreviewState {
  title: string;
  resultUrl: string;
}

export function AssetManagementPage({
  assetItems,
  workflowStats,
  stages,
  tasks,
  assetError,
  onDeleteAsset,
  onDeleteHistory,
}: AssetManagementPageProps) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("全部");
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<AssetPreviewState | null>(null);

  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(assetItems.map((item) => item.category)))],
    [assetItems],
  );

  const filteredAssets = useMemo(
    () =>
      assetItems.filter((item) => {
        const matchesCategory = category === "全部" || item.category === category;
        const searchable = `${item.name} ${item.category} ${item.source} ${item.tags.join(" ")}`;
        const matchesKeyword = searchable.toLowerCase().includes(keyword.trim().toLowerCase());
        return matchesCategory && matchesKeyword;
      }),
    [assetItems, category, keyword],
  );

  async function handleDelete(item: AssetItem) {
    const deleteId = item.persistedAssetId ?? item.persistedHistoryId ?? null;
    if (!deleteId) {
      return;
    }

    setDeletingAssetId(deleteId);
    try {
      if (item.persistedAssetId && onDeleteAsset) {
        await onDeleteAsset(item.persistedAssetId);
        return;
      }

      if (item.persistedHistoryId && onDeleteHistory) {
        await onDeleteHistory(item.persistedHistoryId);
      }
    } finally {
      setDeletingAssetId(null);
    }
  }

  function handlePreview(item: AssetItem) {
    const resultUrl = item.previewUrl ?? item.fileUrl ?? item.storageUrl ?? null;
    if (!resultUrl) {
      return;
    }

    setPreviewState({
      title: item.name,
      resultUrl,
    });
  }

  return (
    <div className="page-stack compact-page">
      <section className="panel compact-panel">
        <div className="stats-grid">
          {workflowStats.slice(0, 4).map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.helper}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel compact-panel">
        <div className="toolbar">
          <div className="tag-row">
            {categories.map((item) => (
              <button
                className={item === category ? "filter-chip active" : "filter-chip"}
                type="button"
                key={item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            className="search-input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索名称、来源或标签..."
          />
        </div>

        {assetError ? <p className="error-text">{assetError}</p> : null}

        <div className="asset-grid">
          {filteredAssets.map((item) => {
            const canPreview = Boolean(item.previewUrl ?? item.fileUrl ?? item.storageUrl);
            const previewImageUrl = item.previewUrl ?? item.fileUrl ?? item.storageUrl ?? null;
            return (
              <article className="asset-card static" key={item.id}>
                <button
                  className={canPreview ? "asset-thumb asset-thumb-button" : "asset-thumb"}
                  type={canPreview ? "button" : undefined}
                  onClick={canPreview ? () => handlePreview(item) : undefined}
                  title={canPreview ? "点击图片灯箱预览" : undefined}
                >
                  {previewImageUrl ? (
                    <img className="asset-thumb-image" src={previewImageUrl} alt={item.name} loading="lazy" />
                  ) : (
                    <div className="asset-thumb-fallback" style={{ background: item.preview }} aria-hidden="true" />
                  )}
                </button>

                <div className="asset-copy">
                  <strong>{item.name}</strong>
                  <span>
                    {item.category} / {item.source}
                  </span>
                  <small>{item.updatedAt}</small>
                </div>

                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span className="soft-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="inline-action-row">
                  {canPreview ? (
                    <a
                      className="secondary-button compact-button"
                      href={
                        buildDownloadUrl(
                          item.fileUrl ?? item.previewUrl ?? item.storageUrl ?? null,
                          buildDownloadFilename(item.name, item.fileUrl ?? item.previewUrl ?? item.storageUrl ?? null),
                        ) ?? item.fileUrl ?? item.previewUrl ?? item.storageUrl ?? undefined
                      }
                      download={buildDownloadFilename(item.name, item.fileUrl ?? item.previewUrl ?? item.storageUrl ?? null)}
                    >
                      下载图片
                    </a>
                  ) : null}

                  {item.deletable && (item.persistedAssetId || item.persistedHistoryId) ? (
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingAssetId === (item.persistedAssetId ?? item.persistedHistoryId ?? null)}
                    >
                      {deletingAssetId === (item.persistedAssetId ?? item.persistedHistoryId ?? null) ? "删除中..." : "删除资产"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {filteredAssets.length === 0 ? (
          <div className="panel-subcard empty-state">
            <p className="muted">没有匹配的资产，可以调整分类或搜索词。</p>
          </div>
        ) : null}
      </section>

      <div className="dashboard-grid">
        <section className="panel compact-panel">
          <SectionHeader
            eyebrow="流程接入"
            title="已支持资产复用的模块"
            description="这些业务页面都支持从资产管理选图或手动上传图片两种来源。"
          />
          <div className="guide-list">
            {stages.map((stage, index) => (
              <article className="guide-step" key={stage.title}>
                <span>{index + 1}</span>
                <div>
                  <h4>{stage.title}</h4>
                  <p>{stage.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel compact-panel">
          <SectionHeader
            eyebrow="待办"
            title="后续建议"
            description="资产管理当前已经接入真实上传资产与删除能力，下一步可以继续补资产复用提交链路。"
          />
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div>
                  <h4>{task.title}</h4>
                  <p>{task.helper}</p>
                </div>
                <span className={`status-pill ${task.statusClass}`}>{task.statusLabel}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      {previewState ? (
        <ResultPreviewModal
          title={previewState.title}
          resultUrl={previewState.resultUrl}
          resultLabel="资产预览"
          onClose={() => setPreviewState(null)}
        />
      ) : null}
    </div>
  );
}
