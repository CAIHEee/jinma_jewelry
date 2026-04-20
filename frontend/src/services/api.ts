import type {
  FusionRequest,
  FusionResult,
  GenerationResult,
  ModelCatalogResponse,
  MultiViewSplitRequest,
  MultiViewSplitResponse,
  ReferenceImageTransformRequest,
  TextToImageRequest,
} from "../types/fusion";
import type { PersistedAssetResponse } from "../types/assets";
import type { PersistedHistoryResponse } from "../types/history";
import type { AssetItem } from "../types/mockData";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || "/api/v1").replace(/\/$/, "");

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isBlobUrl(value: string) {
  return value.startsWith("blob:");
}

function isCustomStorageUrl(value: string) {
  return value.startsWith("local://") || value.startsWith("oss://");
}

export function buildAssetContentUrl(storageUrl: string, filename?: string | null): string {
  const search = new URLSearchParams({ storage_url: storageUrl });
  if (filename) {
    search.set("filename", filename);
  }
  return `${buildApiUrl("/assets/content")}?${search.toString()}`;
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }
  return (await response.json()) as T;
}

export async function fetchModelCatalog(): Promise<ModelCatalogResponse> {
  const response = await fetch(buildApiUrl("/ai/models"), {
    cache: "no-store",
  });
  return handleJsonResponse<ModelCatalogResponse>(response);
}

export async function submitTextToImage(payload: TextToImageRequest): Promise<GenerationResult> {
  const response = await fetch(buildApiUrl("/ai/text-to-image"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<GenerationResult>(response);
}

export async function submitFusionJob(payload: FusionRequest): Promise<FusionResult> {
  const formData = new FormData();
  payload.files?.forEach((file) => formData.append("images", file));
  if (payload.sourceImageUrls?.length) {
    formData.append("source_image_urls_json", JSON.stringify(payload.sourceImageUrls));
  }
  if (payload.sourceImageNames?.length) {
    formData.append("source_image_names_json", JSON.stringify(payload.sourceImageNames));
  }
  formData.append("model", payload.model);
  formData.append("prompt", payload.prompt);
  formData.append("mode", payload.mode);
  formData.append("primary_image_index", String(payload.primaryImageIndex));
  formData.append("strength", String(payload.strength));

  const response = await fetch(buildApiUrl("/ai/fuse-images"), {
    method: "POST",
    body: formData,
  });

  return handleJsonResponse<FusionResult>(response);
}

export async function submitReferenceImageTransform(
  payload: ReferenceImageTransformRequest,
): Promise<GenerationResult> {
  const formData = new FormData();
  if (payload.file) {
    formData.append("image", payload.file);
  }
  if (payload.sourceImageUrl) {
    formData.append("source_image_url", payload.sourceImageUrl);
  }
  if (payload.sourceImageName) {
    formData.append("source_image_name", payload.sourceImageName);
  }
  formData.append("model", payload.model);
  formData.append("prompt", payload.prompt);
  formData.append("feature", payload.feature);
  if (payload.negativePrompt) {
    formData.append("negative_prompt", payload.negativePrompt);
  }
  if (typeof payload.strength === "number") {
    formData.append("strength", String(payload.strength));
  }

  const response = await fetch(buildApiUrl("/ai/reference-image-transform"), {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse<GenerationResult>(response);
}

export async function submitMultiViewGeneration(
  payload: ReferenceImageTransformRequest,
): Promise<GenerationResult> {
  const formData = new FormData();
  if (payload.file) {
    formData.append("image", payload.file);
  }
  if (payload.sourceImageUrl) {
    formData.append("source_image_url", payload.sourceImageUrl);
  }
  if (payload.sourceImageName) {
    formData.append("source_image_name", payload.sourceImageName);
  }
  formData.append("model", payload.model);
  formData.append("prompt", payload.prompt);
  if (payload.negativePrompt) {
    formData.append("negative_prompt", payload.negativePrompt);
  }
  if (typeof payload.strength === "number") {
    formData.append("strength", String(payload.strength));
  }

  const response = await fetch(buildApiUrl("/ai/multi-view"), {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse<GenerationResult>(response);
}

export async function splitMultiViewImage(payload: MultiViewSplitRequest): Promise<MultiViewSplitResponse> {
  const response = await fetch(buildApiUrl("/ai/split-multi-view"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<MultiViewSplitResponse>(response);
}

export async function fetchPersistedHistory(): Promise<PersistedHistoryResponse> {
  const response = await fetch(`${buildApiUrl("/history")}?_=${Date.now()}`, {
    cache: "no-store",
  });
  return handleJsonResponse<PersistedHistoryResponse>(response);
}

export async function fetchPersistedAssets(): Promise<PersistedAssetResponse> {
  const response = await fetch(`${buildApiUrl("/assets")}?_=${Date.now()}`, {
    cache: "no-store",
  });
  return handleJsonResponse<PersistedAssetResponse>(response);
}

export async function uploadInputAsset(file: File, moduleKind: string, sourceKind = "manual_upload") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("module_kind", moduleKind);
  formData.append("source_kind", sourceKind);

  const response = await fetch(buildApiUrl("/assets/upload"), {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse<{ id: string; name: string; storage_url: string; preview_url: string | null }>(response);
}

export async function deletePersistedAsset(assetId: string): Promise<void> {
  const response = await fetch(buildApiUrl(`/assets/${assetId}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Delete asset failed");
  }
}

export async function deletePersistedHistory(historyId: string): Promise<void> {
  const response = await fetch(buildApiUrl(`/history/${historyId}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Delete history failed");
  }
}

export async function assetItemToFile(asset: AssetItem): Promise<File> {
  let assetUrl = asset.fileUrl ?? null;
  if (!assetUrl && asset.storageUrl && isCustomStorageUrl(asset.storageUrl)) {
    assetUrl = buildAssetContentUrl(asset.storageUrl, asset.name);
  }
  if (!assetUrl) {
    assetUrl = asset.previewUrl ?? asset.storageUrl ?? null;
  }
  if (!assetUrl) {
    throw new Error(`资产 ${asset.name} 缺少可用图片地址`);
  }
  if (isBlobUrl(assetUrl)) {
    throw new Error(`资产 ${asset.name} 的当前会话预览已失效，请刷新后重试或重新上传。`);
  }

  const response = await fetch(assetUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`读取资产图片失败：${asset.name}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || "image/png";
  const extension = mimeType.includes("/") ? mimeType.split("/")[1] : "png";
  const fallbackName = `${asset.id}.${extension}`;
  const filename = asset.name.includes(".") ? asset.name : fallbackName;

  return new File([blob], filename, {
    type: mimeType,
    lastModified: Date.now(),
  });
}
