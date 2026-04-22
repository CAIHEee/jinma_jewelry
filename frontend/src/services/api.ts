import type { AdminSystemStatus, AdminUser, AdminUserListResponse } from "../types/admin";
import type { CurrentUser, LoginResponse, ModulePermissionItem } from "../types/auth";
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
import type { PersistedAssetItem, PersistedAssetResponse } from "../types/assets";
import type { PersistedHistoryResponse } from "../types/history";
import type { AssetItem } from "../types/mockData";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || "/api/v1").replace(/\/$/, "");

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });
}

function normalizeApiErrorMessage(rawText: string, fallback = "请求失败"): string {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const payload = JSON.parse(trimmed) as unknown;
    if (typeof payload === "string" && payload.trim()) {
      return payload;
    }
    if (payload && typeof payload === "object") {
      if ("detail" in payload) {
        const detail = (payload as { detail?: unknown }).detail;
        if (typeof detail === "string" && detail.trim()) {
          return detail;
        }
        if (Array.isArray(detail) && detail.length > 0) {
          const firstDetail = detail[0];
          if (typeof firstDetail === "string" && firstDetail.trim()) {
            return firstDetail;
          }
          if (firstDetail && typeof firstDetail === "object" && "msg" in firstDetail) {
            const msg = (firstDetail as { msg?: unknown }).msg;
            if (typeof msg === "string" && msg.trim()) {
              return msg;
            }
          }
        }
      }
      if ("message" in payload) {
        const message = (payload as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) {
          return message;
        }
      }
      if ("error" in payload) {
        const error = (payload as { error?: unknown }).error;
        if (typeof error === "string" && error.trim()) {
          return error;
        }
      }
    }
  } catch {
    // Keep the original text fallback below.
  }

  return trimmed;
}

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const errorText = await response.text();
  throw new Error(normalizeApiErrorMessage(errorText, fallback));
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
    await throwApiError(response, "请求失败");
  }
  return (await response.json()) as T;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await apiFetch(buildApiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleJsonResponse<LoginResponse>(response);
}

export async function registerUser(payload: {
  username: string;
  password: string;
  display_name?: string;
  email?: string;
}): Promise<LoginResponse> {
  const response = await apiFetch(buildApiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<LoginResponse>(response);
}

export async function logout(): Promise<void> {
  const response = await apiFetch(buildApiUrl("/auth/logout"), { method: "POST" });
  if (!response.ok) {
    await throwApiError(response, "退出登录失败");
  }
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await apiFetch(buildApiUrl("/auth/me"), { cache: "no-store" });
  return handleJsonResponse<CurrentUser>(response);
}

export async function fetchModelCatalog(): Promise<ModelCatalogResponse> {
  const response = await apiFetch(buildApiUrl("/ai/models"), { cache: "no-store" });
  return handleJsonResponse<ModelCatalogResponse>(response);
}

export async function submitTextToImage(payload: TextToImageRequest): Promise<GenerationResult> {
  const response = await apiFetch(buildApiUrl("/ai/text-to-image"), {
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

  const response = await apiFetch(buildApiUrl("/ai/fuse-images"), {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse<FusionResult>(response);
}

export async function submitReferenceImageTransform(payload: ReferenceImageTransformRequest): Promise<GenerationResult> {
  return submitReferenceModuleTransform("/ai/reference-image-transform", payload);
}

export async function submitReferenceModuleTransform(path: string, payload: ReferenceImageTransformRequest): Promise<GenerationResult> {
  const formData = new FormData();
  payload.files?.forEach((file) => formData.append("images", file));
  if (payload.file) formData.append("image", payload.file);
  if (payload.sourceImageUrls?.length) {
    formData.append("source_image_urls_json", JSON.stringify(payload.sourceImageUrls));
  }
  if (payload.sourceImageNames?.length) {
    formData.append("source_image_names_json", JSON.stringify(payload.sourceImageNames));
  }
  if (payload.sourceImageUrl) formData.append("source_image_url", payload.sourceImageUrl);
  if (payload.sourceImageName) formData.append("source_image_name", payload.sourceImageName);
  formData.append("model", payload.model);
  formData.append("prompt", payload.prompt);
  formData.append("feature", payload.feature);
  if (payload.negativePrompt) formData.append("negative_prompt", payload.negativePrompt);
  if (typeof payload.strength === "number") formData.append("strength", String(payload.strength));
  if (payload.imageSize) formData.append("image_size", payload.imageSize);

  const response = await apiFetch(buildApiUrl(path), {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse<GenerationResult>(response);
}

export async function submitMultiViewGeneration(payload: ReferenceImageTransformRequest): Promise<GenerationResult> {
  const formData = new FormData();
  if (payload.file) formData.append("image", payload.file);
  if (payload.sourceImageUrl) formData.append("source_image_url", payload.sourceImageUrl);
  if (payload.sourceImageName) formData.append("source_image_name", payload.sourceImageName);
  formData.append("model", payload.model);
  formData.append("prompt", payload.prompt);
  if (payload.negativePrompt) formData.append("negative_prompt", payload.negativePrompt);
  if (typeof payload.strength === "number") formData.append("strength", String(payload.strength));

  const response = await apiFetch(buildApiUrl("/ai/multi-view"), {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse<GenerationResult>(response);
}

export async function splitMultiViewImage(payload: MultiViewSplitRequest): Promise<MultiViewSplitResponse> {
  const response = await apiFetch(buildApiUrl("/ai/split-multi-view"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<MultiViewSplitResponse>(response);
}

export async function submitRemoveBackground(payload: { file?: File | null; sourceImageUrl?: string | null }): Promise<Blob> {
  const formData = new FormData();
  if (payload.file) formData.append("image", payload.file);
  if (payload.sourceImageUrl) formData.append("source_image_url", payload.sourceImageUrl);

  const response = await apiFetch(buildApiUrl("/ai/remove-background"), {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    await throwApiError(response, "去除背景失败");
  }
  return response.blob();
}

export async function fetchPersistedHistory(includeAll = false): Promise<PersistedHistoryResponse> {
  const search = new URLSearchParams({ _: String(Date.now()) });
  if (includeAll) search.set("include_all", "true");
  const response = await apiFetch(`${buildApiUrl("/history")}?${search.toString()}`, { cache: "no-store" });
  return handleJsonResponse<PersistedHistoryResponse>(response);
}

export async function fetchPersistedAssets(scope = "library"): Promise<PersistedAssetResponse> {
  const search = new URLSearchParams({ _: String(Date.now()), scope });
  const response = await apiFetch(`${buildApiUrl("/assets")}?${search.toString()}`, { cache: "no-store" });
  return handleJsonResponse<PersistedAssetResponse>(response);
}

export async function uploadInputAsset(
  file: File,
  moduleKind: string,
  sourceKind = "manual_upload",
  visibility: "private" | "community" = "private",
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("module_kind", moduleKind);
  formData.append("source_kind", sourceKind);
  formData.append("visibility", visibility);

  const response = await apiFetch(buildApiUrl("/assets/upload"), {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse<PersistedAssetItem>(response);
}

export async function publishPersistedAsset(assetId: string): Promise<PersistedAssetItem> {
  const response = await apiFetch(buildApiUrl(`/assets/${assetId}/publish`), { method: "POST" });
  return handleJsonResponse<PersistedAssetItem>(response);
}

export async function unpublishPersistedAsset(assetId: string): Promise<PersistedAssetItem> {
  const response = await apiFetch(buildApiUrl(`/assets/${assetId}/unpublish`), { method: "POST" });
  return handleJsonResponse<PersistedAssetItem>(response);
}

export async function deletePersistedAsset(assetId: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/assets/${assetId}`), { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "删除资产失败");
  }
}

export async function deletePersistedHistory(historyId: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/history/${historyId}`), { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "删除历史记录失败");
  }
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await apiFetch(buildApiUrl("/admin/users"), { cache: "no-store" });
  const body = await handleJsonResponse<AdminUserListResponse>(response);
  return body.items;
}

export async function fetchAdminSystemStatus(): Promise<AdminSystemStatus> {
  const response = await apiFetch(buildApiUrl("/admin/system-status"), { cache: "no-store" });
  return handleJsonResponse<AdminSystemStatus>(response);
}

export async function createAdminUser(payload: {
  username: string;
  display_name?: string;
  email?: string;
  password: string;
  is_disabled?: boolean;
}): Promise<AdminUser> {
  const response = await apiFetch(buildApiUrl("/admin/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<AdminUser>(response);
}

export async function updateAdminUser(
  userId: string,
  payload: { username?: string; display_name?: string | null; email?: string | null; is_disabled?: boolean },
): Promise<AdminUser> {
  const response = await apiFetch(buildApiUrl(`/admin/users/${userId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<AdminUser>(response);
}

export async function resetAdminUserPassword(userId: string, password: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/admin/users/${userId}/reset-password`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    await throwApiError(response, "重置密码失败");
  }
}

export async function updateAdminUserPermissions(userId: string, items: ModulePermissionItem[]): Promise<ModulePermissionItem[]> {
  const response = await apiFetch(buildApiUrl(`/admin/users/${userId}/permissions`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((item) => ({ module_key: item.module_key, is_enabled: item.is_enabled })),
    }),
  });
  return handleJsonResponse<ModulePermissionItem[]>(response);
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/admin/users/${userId}`), { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "删除用户失败");
  }
}

export async function assetItemToFile(asset: AssetItem): Promise<File> {
  let assetUrl = asset.fileUrl ?? null;
  if (!assetUrl && asset.storageUrl && isCustomStorageUrl(asset.storageUrl)) {
    assetUrl = buildAssetContentUrl(asset.storageUrl, asset.name);
  }
  if (!assetUrl) assetUrl = asset.previewUrl ?? asset.storageUrl ?? null;
  if (!assetUrl) throw new Error(`资产 ${asset.name} 缺少可用图片地址`);
  if (isBlobUrl(assetUrl)) throw new Error(`资产 ${asset.name} 的当前会话预览已失效，请刷新后重试或重新上传。`);

  const response = await apiFetch(assetUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`读取资产图片失败：${asset.name}`);

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
