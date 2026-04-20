import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "./components/AppHeader";
import { Sidebar } from "./components/Sidebar";
import { AssetManagementPage } from "./pages/AssetManagementPage";
import { FusionStudio } from "./pages/FusionStudio";
import { GrayscaleReliefPage } from "./pages/GrayscaleReliefPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ImageEditPage } from "./pages/ImageEditPage";
import { MultiViewPage } from "./pages/MultiViewPage";
import { MultiViewSplitPage } from "./pages/MultiViewSplitPage";
import { TextToImagePage } from "./pages/TextToImagePage";
import {
  buildAssetContentUrl,
  deletePersistedAsset,
  deletePersistedHistory,
  fetchPersistedAssets,
  fetchPersistedHistory,
} from "./services/api";
import type { PersistedAssetItem } from "./types/assets";
import type { PersistedHistoryItem } from "./types/history";
import { mockAssetItems, mockStages, mockTasks, mockWorkflowStats } from "./types/mockData";
import type { AssetItem } from "./types/mockData";
import type { WorkspaceRun } from "./types/workspace";
import {
  dedupePersistedHistoryItems,
  formatHistoryTimestamp,
  getHistoryKindLabel,
  isPersistedHistoryDuplicateOfRun,
  mergeModuleHistory,
  normalizeHistoryKind,
  resolveHistoryKind,
} from "./utils/history";

export type AppView =
  | "text-to-image"
  | "multi-view"
  | "multi-view-split"
  | "image-edit"
  | "fusion"
  | "history"
  | "grayscale-relief"
  | "asset-management";

const WORKSPACE_RUNS_STORAGE_KEY = "flux_workspace_runs_v1";
const MAX_STORED_WORKSPACE_RUNS = 60;

function mapKindToAssetCategory(kind: string) {
  const normalizedKind = normalizeHistoryKind(kind);
  return normalizedKind ? getHistoryKindLabel(normalizedKind) : kind;
}

function buildPreviewBackground(url: string | null | undefined) {
  if (!url) {
    return "linear-gradient(135deg, #2b3341 0%, #68758a 100%)";
  }
  return `center / cover no-repeat url("${url}")`;
}

function isMultiViewSplitAsset(item: PersistedAssetItem) {
  return normalizeHistoryKind(item.module_kind ?? "") === "multi_view_split";
}

function parseDisplayTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) {
    return timestamp;
  }

  const normalized = value.trim().replace(/\//g, "-");
  const fallback = Date.parse(normalized);
  if (Number.isFinite(fallback)) {
    return fallback;
  }

  return 0;
}

function isBlobUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("blob:");
}

function isExpiringSignedUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && /[?&](OSSAccessKeyId|Signature|Expires)=/i.test(value);
}

function normalizeComparableUrl(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  if (value.startsWith("oss://") || value.startsWith("local://")) {
    return value;
  }

  try {
    const url = new URL(value, "http://placeholder.local");
    if (url.pathname.endsWith("/api/v1/assets/content")) {
      const storageUrl = url.searchParams.get("storage_url");
      const filename = url.searchParams.get("filename");
      if (storageUrl) {
        return `${url.origin}${url.pathname}?storage_url=${storageUrl}${filename ? `&filename=${filename}` : ""}`;
      }
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split("?")[0]?.split("#")[0] ?? value;
  }
}

function dedupeAssetItems(items: AssetItem[]) {
  const deduped = new Map<string, AssetItem>();

  for (const item of items) {
    const comparableUrl = normalizeComparableUrl(item.previewUrl ?? item.storageUrl ?? item.fileUrl ?? null);
    const dedupeKey = comparableUrl || `${item.name}|${item.category}`;
    const existing = deduped.get(dedupeKey);

    if (!existing) {
      deduped.set(dedupeKey, item);
      continue;
    }

    const existingRank = existing.source === "当前会话" ? 0 : 1;
    const nextRank = item.source === "当前会话" ? 0 : 1;
    if (nextRank > existingRank) {
      deduped.set(dedupeKey, item);
    }
  }

  return Array.from(deduped.values());
}

function loadStoredWorkspaceRuns(): WorkspaceRun[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_RUNS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is WorkspaceRun => {
        if (!item || typeof item !== "object") {
          return false;
        }

        return (
          typeof item.id === "string" &&
          typeof item.kind === "string" &&
          typeof item.title === "string" &&
          typeof item.model === "string" &&
          typeof item.provider === "string" &&
          typeof item.status === "string" &&
          typeof item.createdAt === "string" &&
          typeof item.prompt === "string"
        );
      })
      .filter((item) => !isExpiringSignedUrl(item.imageUrl))
      .map((item) => ({
        ...item,
        imageUrl: isBlobUrl(item.imageUrl) || isExpiringSignedUrl(item.imageUrl) ? null : item.imageUrl,
        sourceImageUrl: isBlobUrl(item.sourceImageUrl) || isExpiringSignedUrl(item.sourceImageUrl) ? null : item.sourceImageUrl,
        sourceImages: Array.isArray(item.sourceImages)
          ? item.sourceImages.filter((entry): entry is string => typeof entry === "string" && !isBlobUrl(entry) && !isExpiringSignedUrl(entry))
          : item.sourceImages,
        splitItems: Array.isArray(item.splitItems)
          ? item.splitItems
              .filter(
                (entry): entry is NonNullable<WorkspaceRun["splitItems"]>[number] =>
                  Boolean(entry) &&
                  typeof entry === "object" &&
                  typeof entry.view === "string" &&
                  typeof entry.width === "number" &&
                  typeof entry.height === "number",
              )
              .map((entry) => ({
                ...entry,
                imageUrl: isBlobUrl(entry.imageUrl) || isExpiringSignedUrl(entry.imageUrl) ? null : entry.imageUrl,
              }))
          : item.splitItems,
      }));
  } catch {
    return [];
  }
}

function persistWorkspaceRuns(runs: WorkspaceRun[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WORKSPACE_RUNS_STORAGE_KEY, JSON.stringify(runs.slice(0, MAX_STORED_WORKSPACE_RUNS)));
  } catch {
    // Ignore storage write failures and continue using in-memory state.
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>("text-to-image");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceRuns, setWorkspaceRuns] = useState<WorkspaceRun[]>(() => loadStoredWorkspaceRuns());
  const [persistedItems, setPersistedItems] = useState<PersistedHistoryItem[]>([]);
  const [persistedAssets, setPersistedAssets] = useState<PersistedAssetItem[]>([]);
  const [persistedError, setPersistedError] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);

  useEffect(() => {
    void refreshPersistedHistory();
    void refreshPersistedAssets();
  }, []);

  useEffect(() => {
    persistWorkspaceRuns(workspaceRuns);
  }, [workspaceRuns]);

  async function refreshPersistedHistory() {
    try {
      const response = await fetchPersistedHistory();
      setPersistedItems(dedupePersistedHistoryItems(response.items));
      setPersistedError(null);
    } catch (error) {
      setPersistedError(error instanceof Error ? error.message : "加载持久化历史失败");
    }
  }

  async function refreshPersistedAssets() {
    try {
      const response = await fetchPersistedAssets();
      setPersistedAssets(response.items.filter((item) => !isMultiViewSplitAsset(item)));
      setAssetError(null);
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "加载资产失败");
    }
  }

  async function handleDeleteAsset(assetId: string) {
    await deletePersistedAsset(assetId);
    await refreshPersistedAssets();
  }

  async function handleDeleteHistory(historyId: string) {
    const target = persistedItems.find((item) => item.id === historyId);
    await deletePersistedHistory(historyId);
    setPersistedItems((current) => current.filter((item) => item.id !== historyId));

    if (target) {
      setWorkspaceRuns((current) => current.filter((run) => !isPersistedHistoryDuplicateOfRun(target, run)));
    }

    await refreshPersistedHistory();
    await refreshPersistedAssets();
  }

  const assetItems = useMemo<AssetItem[]>(() => {
    const uploadedAssets = persistedAssets.map((item) => {
      const moduleLabel = item.module_kind ? mapKindToAssetCategory(item.module_kind) : "已上传资产";
      const previewUrl = item.preview_url ?? item.storage_url;
      return {
        id: `asset-${item.id}`,
        name: item.name,
        category: moduleLabel,
        source: "资产库",
        updatedAt: formatHistoryTimestamp(item.created_at),
        sortAt: item.created_at,
        preview: buildPreviewBackground(previewUrl),
        tags: [moduleLabel, item.source_kind],
        storageUrl: item.storage_url,
        previewUrl,
        fileUrl: buildAssetContentUrl(item.storage_url, item.name),
        persistedAssetId: item.id,
        deletable: true,
      };
    });

    const persistedHistoryAssets = persistedItems
      .filter((item) => item.preview_url || item.storage_url || item.image_url)
      .map((item) => {
        const previewUrl = item.preview_url ?? item.storage_url ?? item.image_url;
        return {
          id: `persisted-${item.id}`,
          name: item.title,
          category: mapKindToAssetCategory(item.kind),
          source: "OSS 历史记录",
          updatedAt: formatHistoryTimestamp(item.created_at),
          sortAt: item.created_at,
          preview: buildPreviewBackground(previewUrl),
          tags: [mapKindToAssetCategory(item.kind), item.model, item.provider],
          storageUrl: item.storage_url ?? undefined,
          previewUrl,
          fileUrl: item.storage_url ? buildAssetContentUrl(item.storage_url, item.title) : undefined,
          persistedHistoryId: item.id,
          deletable: true,
        };
      });

    const sessionAssets = workspaceRuns
      .filter((item) => item.imageUrl && !isBlobUrl(item.imageUrl))
      .map((item) => ({
        id: `session-${item.id}`,
        name: item.title,
        category: mapKindToAssetCategory(item.kind),
        source: "当前会话",
        updatedAt: formatHistoryTimestamp(item.createdAt),
        sortAt: item.createdAt,
        preview: buildPreviewBackground(item.imageUrl),
        tags: [mapKindToAssetCategory(item.kind), item.model, item.provider],
        previewUrl: item.imageUrl,
        fileUrl: item.imageUrl ? buildAssetContentUrl(item.imageUrl, item.title) : undefined,
      }));

    const merged = dedupeAssetItems([...uploadedAssets, ...sessionAssets, ...persistedHistoryAssets]).sort(
      (left, right) => parseDisplayTimestamp(right.sortAt ?? right.updatedAt) - parseDisplayTimestamp(left.sortAt ?? left.updatedAt),
    );
    return merged.length > 0 ? merged : mockAssetItems;
  }, [persistedAssets, persistedItems, workspaceRuns]);

  const currentViewTitle = useMemo(() => {
    const titleMap: Record<AppView, string> = {
      "text-to-image": "文生图",
      "multi-view": "生成多视图",
      "multi-view-split": "多视图切图",
      "image-edit": "线稿转写实图",
      fusion: "多图融合",
      history: "历史记录",
      "grayscale-relief": "转灰度图",
      "asset-management": "资产管理",
    };
    return titleMap[activeView];
  }, [activeView]);

  const textToImageRuns = useMemo(() => mergeModuleHistory(persistedItems, workspaceRuns, "text_to_image"), [persistedItems, workspaceRuns]);
  const fusionRuns = useMemo(() => mergeModuleHistory(persistedItems, workspaceRuns, "fusion"), [persistedItems, workspaceRuns]);
  const imageEditRuns = useMemo(() => mergeModuleHistory(persistedItems, workspaceRuns, "sketch_to_realistic"), [persistedItems, workspaceRuns]);
  const grayscaleRuns = useMemo(() => mergeModuleHistory(persistedItems, workspaceRuns, "grayscale_relief"), [persistedItems, workspaceRuns]);
  const multiViewRuns = useMemo(() => mergeModuleHistory(persistedItems, workspaceRuns, "multi_view"), [persistedItems, workspaceRuns]);
  const multiViewSplitRuns = useMemo(() => mergeModuleHistory(persistedItems, workspaceRuns, "multi_view_split"), [persistedItems, workspaceRuns]);
  function recordWorkspaceRun(run: Omit<WorkspaceRun, "id" | "createdAt">) {
    setWorkspaceRuns((current) => [
      {
        ...run,
        id: `${run.kind}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, MAX_STORED_WORKSPACE_RUNS));
    void refreshPersistedHistory();
    void refreshPersistedAssets();
    window.setTimeout(() => {
      void refreshPersistedHistory();
      void refreshPersistedAssets();
    }, 800);
  }

  return (
    <div className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <Sidebar
        activeView={activeView}
        onChange={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <main className="workspace">
        <AppHeader title={currentViewTitle} />

        <section className={activeView === "text-to-image" ? "view-panel active" : "view-panel hidden"}>
          <TextToImagePage onRecordRun={recordWorkspaceRun} pageRuns={textToImageRuns} onDeleteHistory={handleDeleteHistory} />
        </section>

        <section className={activeView === "multi-view" ? "view-panel active" : "view-panel hidden"}>
          <MultiViewPage assetItems={assetItems} onRecordRun={recordWorkspaceRun} pageRuns={multiViewRuns} onDeleteHistory={handleDeleteHistory} />
        </section>

        <section className={activeView === "multi-view-split" ? "view-panel active" : "view-panel hidden"}>
          <MultiViewSplitPage assetItems={assetItems} onRecordRun={recordWorkspaceRun} pageRuns={multiViewSplitRuns} />
        </section>

        <section className={activeView === "image-edit" ? "view-panel active" : "view-panel hidden"}>
          <ImageEditPage assetItems={assetItems} onRecordRun={recordWorkspaceRun} pageRuns={imageEditRuns} onDeleteHistory={handleDeleteHistory} />
        </section>

        <section className={activeView === "grayscale-relief" ? "view-panel active" : "view-panel hidden"}>
          <GrayscaleReliefPage assetItems={assetItems} onRecordRun={recordWorkspaceRun} pageRuns={grayscaleRuns} onDeleteHistory={handleDeleteHistory} />
        </section>

        <section className={activeView === "fusion" ? "view-panel active" : "view-panel hidden"}>
          <FusionStudio onRecordRun={recordWorkspaceRun} assetItems={assetItems} pageRuns={fusionRuns} />
        </section>

        <section className={activeView === "history" ? "view-panel active" : "view-panel hidden"}>
          <HistoryPage
            workspaceRuns={workspaceRuns}
            persistedItems={persistedItems}
            persistedError={persistedError}
            onDeleteHistory={handleDeleteHistory}
          />
        </section>

        <section className={activeView === "asset-management" ? "view-panel active" : "view-panel hidden"}>
          <AssetManagementPage
            assetItems={assetItems}
            workflowStats={mockWorkflowStats}
            stages={mockStages}
            tasks={mockTasks}
            assetError={assetError}
            onDeleteAsset={handleDeleteAsset}
            onDeleteHistory={handleDeleteHistory}
          />
        </section>
      </main>
    </div>
  );
}
