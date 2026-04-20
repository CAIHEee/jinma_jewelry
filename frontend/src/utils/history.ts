import { buildAssetContentUrl } from "../services/api";
import type { PersistedHistoryItem } from "../types/history";
import type { WorkspaceRun } from "../types/workspace";

export type NormalizedHistoryKind =
  | "text_to_image"
  | "fusion"
  | "multi_view"
  | "multi_view_split"
  | "sketch_to_realistic"
  | "grayscale_relief";

export interface ModuleHistoryEntry {
  id: string;
  persistedId?: string;
  kind: NormalizedHistoryKind;
  title: string;
  model: string;
  provider: string;
  status: string;
  prompt: string;
  imageUrl: string | null;
  sourceImageUrl: string | null;
  sourceImages: string[];
  primaryImageIndex: number | null;
  splitItems: Array<{
    view: string;
    imageUrl: string | null;
    storageUrl?: string | null;
    width: number;
    height: number;
  }>;
  createdAt: string;
  source: "persisted" | "session";
}

function isBrowserObjectUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("blob:");
}

function resolveStableAssetUrl(storageUrl: string | null | undefined, fallbackUrl: string | null | undefined, filename?: string | null): string | null {
  if (storageUrl) {
    return buildAssetContentUrl(storageUrl, filename);
  }
  return fallbackUrl ?? null;
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

const KIND_LABEL_MAP: Record<NormalizedHistoryKind, string> = {
  text_to_image: "\u6587\u751f\u56fe",
  fusion: "\u591a\u56fe\u878d\u5408",
  multi_view: "\u751f\u6210\u591a\u89c6\u56fe",
  multi_view_split: "\u591a\u89c6\u56fe\u5207\u56fe",
  sketch_to_realistic: "\u7ebf\u7a3f\u8f6c\u5199\u5b9e\u56fe",
  grayscale_relief: "\u8f6c\u7070\u5ea6\u56fe",
};

const SPLIT_TITLE_KEYWORD = "\u591a\u89c6\u56fe\u5207\u56fe";

export function normalizeHistoryKind(kind: string): NormalizedHistoryKind | null {
  const normalized = kind.trim().toLowerCase();
  const aliasMap: Record<string, NormalizedHistoryKind> = {
    text_to_image: "text_to_image",
    fusion: "fusion",
    multi_view: "multi_view",
    multi_view_split: "multi_view_split",
    split_multi_view: "multi_view_split",
    multi_image_fusion: "fusion",
    sketch_to_realistic: "sketch_to_realistic",
    image_edit: "sketch_to_realistic",
    grayscale_relief: "grayscale_relief",
  };

  return aliasMap[normalized] ?? null;
}

export function getHistoryKindLabel(kind: string): string {
  const normalized = normalizeHistoryKind(kind);
  return normalized ? KIND_LABEL_MAP[normalized] : kind;
}

export function formatHistoryTimestamp(value: string): string {
  const timestamp = parseHistoryTimestamp(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function toModuleHistoryEntry(item: PersistedHistoryItem | WorkspaceRun): ModuleHistoryEntry | null {
  if ("imageUrl" in item) {
    const normalizedKind = normalizeHistoryKind(resolveHistoryKind(item.kind, item.title, item.prompt, null));
    if (!normalizedKind) {
      return null;
    }

    return {
      id: `session-${item.id}`,
      kind: normalizedKind,
      title: item.title,
      model: item.model,
      provider: item.provider,
      status: item.status,
      prompt: item.prompt,
      imageUrl: isBrowserObjectUrl(item.imageUrl) ? null : item.imageUrl,
      sourceImageUrl: isBrowserObjectUrl(item.sourceImageUrl) ? null : (item.sourceImageUrl ?? item.sourceImages?.[0] ?? null),
      sourceImages: (item.sourceImages ?? []).filter((entry): entry is string => Boolean(entry) && !isBrowserObjectUrl(entry)),
      primaryImageIndex: item.primaryImageIndex ?? null,
      splitItems: (item.splitItems ?? []).map((entry) => ({
        ...entry,
        imageUrl: isBrowserObjectUrl(entry.imageUrl) ? null : entry.imageUrl,
      })),
      createdAt: item.createdAt,
      source: "session",
    };
  }

  const normalizedKind = normalizeHistoryKind(resolveHistoryKind(item.kind, item.title, item.prompt, item.metadata ?? null));
  if (!normalizedKind) {
    return null;
  }

  return {
    id: `persisted-${item.id}`,
    persistedId: item.id,
    kind: normalizedKind,
    title: item.title,
    model: item.model,
    provider: item.provider,
    status: item.status,
    prompt: item.prompt,
    imageUrl: resolveStableAssetUrl(item.storage_url, item.preview_url ?? item.image_url, item.title),
    sourceImageUrl: extractSourceImageUrl(item.metadata ?? null),
    sourceImages: extractSourceImages(item.metadata ?? null),
    primaryImageIndex: extractPrimaryImageIndex(item.metadata ?? null),
    splitItems: extractSplitItems(item.metadata ?? null),
    createdAt: item.created_at,
    source: "persisted",
  };
}

export function buildModuleHistoryDedupeKey(item: ModuleHistoryEntry): string {
  if (item.kind === "multi_view_split") {
    return buildModuleHistorySplitDedupeKey(item);
  }

  return [item.kind, item.title, item.model, item.provider, item.prompt, normalizeComparableUrl(item.imageUrl)].join("|");
}

export function isPersistedHistoryDuplicateOfRun(item: PersistedHistoryItem, run: WorkspaceRun): boolean {
  const persistedEntry = toModuleHistoryEntry(item);
  const runEntry = toModuleHistoryEntry(run);
  if (!persistedEntry || !runEntry) {
    return false;
  }

  return buildModuleHistoryDedupeKey(persistedEntry) === buildModuleHistoryDedupeKey(runEntry);
}

export function mergeModuleHistory(
  persistedItems: PersistedHistoryItem[],
  workspaceRuns: WorkspaceRun[],
  kind: NormalizedHistoryKind,
): ModuleHistoryEntry[] {
  const merged = [...workspaceRuns, ...persistedItems]
    .map((item) => toModuleHistoryEntry(item))
    .filter((item): item is ModuleHistoryEntry => Boolean(item))
    .filter((item) => item.kind === kind)
    .sort((left, right) => {
      const rightTimestamp = parseHistoryTimestamp(right.createdAt);
      const leftTimestamp = parseHistoryTimestamp(left.createdAt);
      return rightTimestamp - leftTimestamp;
    });

  const deduped = new Map<string, ModuleHistoryEntry>();
  for (const item of merged) {
    const dedupeKey = buildModuleHistoryDedupeKey(item);
    const existing = deduped.get(dedupeKey);
    if (!existing) {
      deduped.set(dedupeKey, item);
      continue;
    }

    const shouldReplace =
      (existing.source === "session" && item.source === "persisted") ||
      (!existing.sourceImageUrl && Boolean(item.sourceImageUrl)) ||
      (existing.sourceImages.length === 0 && item.sourceImages.length > 0);

    if (shouldReplace) {
      deduped.set(dedupeKey, item);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const rightTimestamp = parseHistoryTimestamp(right.createdAt);
    const leftTimestamp = parseHistoryTimestamp(left.createdAt);
    return rightTimestamp - leftTimestamp;
  });
}

function parseHistoryTimestamp(value: string): number {
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) {
    return direct;
  }

  const normalized = value.trim().replace(/\//g, "-");
  const fallback = Date.parse(normalized);
  if (Number.isFinite(fallback)) {
    return fallback;
  }

  return 0;
}

export function dedupePersistedHistoryItems(items: PersistedHistoryItem[]): PersistedHistoryItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const dedupeKey = buildPersistedHistoryDedupeKey(item);
    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

export function resolveHistoryKind(
  kind: string,
  title: string,
  prompt: string,
  metadata: Record<string, unknown> | null,
): string {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedPrompt = prompt.trim().toLowerCase();
  const hasSplitItems = Array.isArray(metadata?.items) && metadata.items.length > 0;
  const hasSplitMetadata =
    Boolean(metadata?.split_x_ratio) ||
    Boolean(metadata?.split_y_ratio) ||
    Boolean(metadata?.gap_x_ratio) ||
    Boolean(metadata?.gap_y_ratio) ||
    hasSplitItems;

  if (
    kind === "multi_view_split" ||
    kind === "split_multi_view" ||
    normalizedTitle.includes("multi-view split") ||
    title.includes(SPLIT_TITLE_KEYWORD) ||
    normalizedPrompt.includes("split four-grid multi-view") ||
    hasSplitMetadata
  ) {
    return "multi_view_split";
  }

  return kind;
}

function buildPersistedHistoryDedupeKey(item: PersistedHistoryItem): string {
  const resolvedKind = resolveHistoryKind(item.kind, item.title, item.prompt, item.metadata ?? null);
  const url = item.preview_url ?? item.storage_url ?? item.image_url ?? "";
  const comparableUrl = item.storage_url ? buildAssetContentUrl(item.storage_url, item.title) : url;

  if (resolvedKind === "multi_view_split") {
    const metadata = item.metadata ?? {};
    const sourceImageUrl = typeof metadata.source_image_url === "string" ? metadata.source_image_url : "";
    const splitX = String(metadata.split_x_ratio ?? "");
    const splitY = String(metadata.split_y_ratio ?? "");
    const gapX = String(metadata.gap_x_ratio ?? "");
    const gapY = String(metadata.gap_y_ratio ?? "");
    return [resolvedKind, item.model, sourceImageUrl || comparableUrl, splitX, splitY, gapX, gapY].join("|");
  }

  return [resolvedKind, item.title, item.model, item.provider, item.prompt, comparableUrl].join("|");
}

function extractSourceImageUrl(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) {
    return null;
  }

  if (typeof metadata.source_image_storage_url === "string" && metadata.source_image_storage_url) {
    return buildAssetContentUrl(metadata.source_image_storage_url);
  }

  if (typeof metadata.source_image_url === "string" && metadata.source_image_url) {
    return metadata.source_image_url;
  }

  const sourceImages = extractSourceImages(metadata);
  return sourceImages[0] ?? null;
}

function extractSourceImages(metadata: Record<string, unknown> | null): string[] {
  if (!metadata || !Array.isArray(metadata.source_images)) {
    return [];
  }

  return metadata.source_images
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const previewUrl = "preview_url" in item && typeof item.preview_url === "string" ? item.preview_url : null;
      const sourceUrl = "source_image_url" in item && typeof item.source_image_url === "string" ? item.source_image_url : null;
      const storageUrl = "storage_url" in item && typeof item.storage_url === "string" ? item.storage_url : null;
      const filename = "filename" in item && typeof item.filename === "string" ? item.filename : null;
      return resolveStableAssetUrl(storageUrl, previewUrl ?? sourceUrl, filename);
    })
    .filter((item): item is string => Boolean(item));
}

function extractPrimaryImageIndex(metadata: Record<string, unknown> | null): number | null {
  if (!metadata || typeof metadata.primary_image_index !== "number") {
    return null;
  }

  return metadata.primary_image_index;
}

function buildModuleHistorySplitDedupeKey(item: ModuleHistoryEntry): string {
  const sourceImageUrl = normalizeComparableUrl(item.sourceImageUrl ?? item.sourceImages[0] ?? "");
  const splitViews = item.splitItems
    .map((entry) => `${entry.view}:${entry.width}x${entry.height}:${normalizeComparableUrl(entry.imageUrl ?? entry.storageUrl ?? "")}`)
    .sort()
    .join("|");

  return [
    item.kind,
    item.model,
    item.provider === "system" ? "system" : item.provider,
    sourceImageUrl,
    splitViews || normalizeComparableUrl(item.imageUrl),
  ].join("|");
}

function extractSplitItems(metadata: Record<string, unknown> | null) {
  if (!metadata || !Array.isArray(metadata.items)) {
    return [];
  }

  return metadata.items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const view = "view" in item && typeof item.view === "string" ? item.view : null;
      const storageUrl = "storage_url" in item && typeof item.storage_url === "string" ? item.storage_url : null;
      const imageUrl = resolveStableAssetUrl(
        storageUrl,
        "image_url" in item && typeof item.image_url === "string"
          ? item.image_url
          : "preview_url" in item && typeof item.preview_url === "string"
            ? item.preview_url
            : null,
        view,
      );
      const width = "width" in item && typeof item.width === "number" ? item.width : null;
      const height = "height" in item && typeof item.height === "number" ? item.height : null;

      if (!view || width === null || height === null) {
        return null;
      }

      return {
        view,
        imageUrl,
        storageUrl,
        width,
        height,
      };
    })
    .filter(
      (
        item,
      ): item is { view: string; imageUrl: string | null; storageUrl?: string | null; width: number; height: number } => Boolean(item),
    );
}
