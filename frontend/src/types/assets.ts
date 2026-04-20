export interface PersistedAssetItem {
  id: string;
  name: string;
  source_kind: string;
  module_kind: string | null;
  storage_url: string;
  preview_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface PersistedAssetResponse {
  items: PersistedAssetItem[];
}
