import { useEffect, useMemo, useState } from "react";

import { ResultPreviewModal } from "../components/ResultPreviewModal";
import type { CurrentUser } from "../types/auth";
import type { AssetItem } from "../types/mockData";
import { buildDownloadFilename, buildDownloadUrl } from "../utils/download";

interface AssetManagementPageProps {
  assetItems: AssetItem[];
  assetError?: string | null;
  currentUser: CurrentUser;
  onDeleteAsset?: (assetId: string) => Promise<void> | void;
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
  onPublishAsset?: (assetId: string) => Promise<void> | void;
  onUnpublishAsset?: (assetId: string) => Promise<void> | void;
  onUploadCommunityAsset?: (file: File, moduleKind: string) => Promise<void> | void;
}

interface AssetPreviewState {
  title: string;
  resultUrl: string;
}

interface AssetToastState {
  type: "success" | "error";
  message: string;
}

type AssetTab = "all" | "mine" | "community";

export function AssetManagementPage({
  assetItems,
  assetError,
  currentUser,
  onDeleteAsset,
  onDeleteHistory,
  onPublishAsset,
  onUnpublishAsset,
  onUploadCommunityAsset,
}: AssetManagementPageProps) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("全部");
  const [activeTab, setActiveTab] = useState<AssetTab>("mine");
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<AssetPreviewState | null>(null);
  const [communityUploadFile, setCommunityUploadFile] = useState<File | null>(null);
  const [toast, setToast] = useState<AssetToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const categories = useMemo(() => ["全部", ...Array.from(new Set(assetItems.map((item) => item.category)))], [assetItems]);

  const filteredAssets = useMemo(
    () =>
      assetItems.filter((item) => {
        const matchesCategory = category === "全部" || item.category === category;
        const searchable = `${item.name} ${item.category} ${item.source} ${item.tags.join(" ")}`;
        const matchesKeyword = searchable.toLowerCase().includes(keyword.trim().toLowerCase());
        const matchesTab =
          activeTab === "all" ||
          (activeTab === "mine" && (item.scope !== "community" || item.ownerUsername === currentUser.username)) ||
          (activeTab === "community" && item.scope === "community");
        return matchesCategory && matchesKeyword && matchesTab;
      }),
    [activeTab, assetItems, category, currentUser.username, keyword],
  );

  async function handleDelete(item: AssetItem) {
    const deleteId = item.persistedAssetId ?? item.persistedHistoryId ?? null;
    if (!deleteId) return;
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
    if (!resultUrl) return;
    setPreviewState({ title: item.name, resultUrl });
  }

  async function handlePublish(assetId: string) {
    if (!onPublishAsset) return;
    try {
      await onPublishAsset(assetId);
      setToast({ type: "success", message: "已发布到社区" });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "发布失败" });
    }
  }

  async function handleUnpublish(assetId: string) {
    if (!onUnpublishAsset) return;
    try {
      await onUnpublishAsset(assetId);
      setToast({ type: "success", message: "已撤回到个人资产" });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "撤回失败" });
    }
  }

  return (
    <div className="page-stack compact-page">
      <section className="panel compact-panel">
        <div className="asset-primary-nav">
          <button
            className={activeTab === "mine" ? "asset-primary-nav-button active" : "asset-primary-nav-button"}
            type="button"
            onClick={() => setActiveTab("mine")}
          >
            个人资产
          </button>
          <button
            className={activeTab === "community" ? "asset-primary-nav-button active" : "asset-primary-nav-button"}
            type="button"
            onClick={() => setActiveTab("community")}
          >
            社区资产
          </button>
        </div>
        <div className="toolbar">
          <div className="asset-subnav">
            {categories.map((item) => (
              <button className={item === category ? "filter-chip active" : "filter-chip"} type="button" key={item} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <input className="search-input asset-search-input" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索名称、来源或标签..." />
        </div>

        {currentUser.role === "root" && activeTab === "community" && onUploadCommunityAsset ? (
          <div className="asset-upload-bar">
            <label className="asset-file-picker" htmlFor="community-asset-upload">
              <span className="asset-file-picker-button">选择文件</span>
              <span className="asset-file-picker-name">{communityUploadFile?.name ?? "未选择任何文件"}</span>
            </label>
            <input
              id="community-asset-upload"
              className="asset-file-input"
              type="file"
              accept="image/*"
              onChange={(event) => setCommunityUploadFile(event.target.files?.[0] ?? null)}
            />
            <button
              className="secondary-button compact-button asset-upload-button"
              type="button"
              disabled={!communityUploadFile}
              onClick={() => communityUploadFile && void onUploadCommunityAsset(communityUploadFile, "asset_management")}
            >
              上传社区资产
            </button>
          </div>
        ) : null}

        {assetError ? <p className="error-text">{assetError}</p> : null}
        {toast ? <div className={toast.type === "success" ? "asset-toast success" : "asset-toast error"}>{toast.message}</div> : null}

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
                  {item.ownerUsername ? <small>归属: {item.ownerUsername}</small> : null}
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
                      href={buildDownloadUrl(item.fileUrl ?? item.previewUrl ?? item.storageUrl ?? null, buildDownloadFilename(item.name, item.fileUrl ?? item.previewUrl ?? item.storageUrl ?? null)) ?? item.fileUrl ?? item.previewUrl ?? item.storageUrl ?? undefined}
                      download={buildDownloadFilename(item.name, item.fileUrl ?? item.previewUrl ?? item.storageUrl ?? null)}
                    >
                      下载图片
                    </a>
                  ) : null}

                  {item.persistedAssetId && item.scope !== "community" && item.canPublish && onPublishAsset ? (
                    <button className="secondary-button compact-button" type="button" onClick={() => void handlePublish(item.persistedAssetId!)}>
                      发布到社区
                    </button>
                  ) : null}

                  {item.persistedAssetId && item.canUnpublish && onUnpublishAsset ? (
                    <button className="secondary-button compact-button" type="button" onClick={() => void handleUnpublish(item.persistedAssetId!)}>
                      撤回社区
                    </button>
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
            <p className="muted">没有匹配的资产，可以调整视图、分类或搜索词。</p>
          </div>
        ) : null}
      </section>

      {previewState ? <ResultPreviewModal title={previewState.title} resultUrl={previewState.resultUrl} resultLabel="资产预览" onClose={() => setPreviewState(null)} /> : null}
    </div>
  );
}
