import { useEffect, useMemo, useState } from "react";

import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { AssetSourcePicker } from "./AssetSourcePicker";
import { PageGenerationHistory } from "./PageGenerationHistory";
import { PromptTemplateImporter } from "./PromptTemplateImporter";
import { ResultPreviewModal } from "./ResultPreviewModal";
import { getPromptTemplatesByModule } from "../data/promptTemplates";
import { useModelCatalog } from "../hooks/useModelCatalog";
import { submitReferenceModuleTransform } from "../services/api";
import type { GenerationResult } from "../types/fusion";
import type { AssetItem } from "../types/mockData";
import type { PromptTemplate } from "../types/prompts";
import type { WorkspaceRun } from "../types/workspace";
import type { ModuleHistoryEntry } from "../utils/history";

interface ReferenceTransformModulePageProps {
  assetItems: AssetItem[];
  onRecordRun: (run: Omit<WorkspaceRun, "id" | "createdAt">) => void;
  pageRuns: ModuleHistoryEntry[];
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
  pageTitle: string;
  historyTitle: string;
  previewTitle: string;
  resultLabel: string;
  sourcePickerTitle: string;
  uploadLabel: string;
  promptLabel: string;
  submitLabel: string;
  loadingLabel: string;
  emptyModelError: string;
  emptyAssetError: string;
  submitErrorLabel: string;
  feature: "product_refine" | "gemstone_design" | "upscale";
  module: PromptTemplate["module"];
  historyKind: "product_refine" | "gemstone_design" | "upscale";
  endpointPath: string;
  defaultPrompt: string;
  imageSize?: "1K" | "2K";
}

export function ReferenceTransformModulePage({
  assetItems,
  onRecordRun,
  pageRuns,
  onDeleteHistory,
  pageTitle,
  historyTitle,
  previewTitle,
  resultLabel,
  sourcePickerTitle,
  uploadLabel,
  promptLabel,
  submitLabel,
  loadingLabel,
  emptyModelError,
  emptyAssetError,
  submitErrorLabel,
  feature,
  module,
  historyKind,
  endpointPath,
  defaultPrompt,
  imageSize = "1K",
}: ReferenceTransformModulePageProps) {
  const templates = getPromptTemplatesByModule(module);
  const initialPrompt = templates[0]?.chinese ?? defaultPrompt;
  const { models, error: modelError, defaultModelId } = useModelCatalog((model) => model.supports_reference_images);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [model, setModel] = useState(defaultModelId);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<AssetItem[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!models.length) return;
    if (!model || !models.some((item) => item.id === model)) setModel(defaultModelId);
  }, [defaultModelId, model, models]);

  useEffect(() => {
    if (result || selectedHistoryId || pageRuns.length === 0) return;
    setSelectedHistoryId(pageRuns[0].id);
  }, [pageRuns, result, selectedHistoryId]);

  const selectedModel = useMemo(() => models.find((item) => item.id === model) ?? models[0] ?? null, [model, models]);
  const uploadedPreviewUrl = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files]);
  const selectedHistory = useMemo(() => pageRuns.find((item) => item.id === selectedHistoryId) ?? null, [pageRuns, selectedHistoryId]);
  const activeHistory = selectedHistory ?? (!result ? pageRuns[0] ?? null : null);
  const previewResultUrl = activeHistory?.imageUrl ?? result?.image_url ?? null;
  const previewSourceUrl = activeHistory?.sourceImageUrl ?? (uploadedPreviewUrl ?? selectedAssets[0]?.previewUrl ?? selectedAssets[0]?.storageUrl ?? null);

  useEffect(() => {
    return () => {
      if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
    };
  }, [uploadedPreviewUrl]);

  async function handleSubmit() {
    if (!selectedModel) {
      setError(emptyModelError);
      return;
    }
    if (files.length === 0 && selectedAssets.length === 0) {
      setError(emptyAssetError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const selectedAsset = selectedAssets[0] ?? null;
      const selectedAssetUrl = selectedAsset?.fileUrl ?? selectedAsset?.previewUrl ?? selectedAsset?.storageUrl ?? null;
      const inputFile = files[0] ?? null;
      if (!inputFile && !selectedAssetUrl) throw new Error("未获取到可用参考图");

      const response = await submitReferenceModuleTransform(endpointPath, {
        file: inputFile,
        sourceImageUrl: inputFile ? undefined : selectedAssetUrl ?? undefined,
        sourceImageName: inputFile ? undefined : selectedAsset?.name,
        model: selectedModel.id,
        prompt,
        feature,
        imageSize,
      });

      setResult(response);
      setSelectedHistoryId(null);
      onRecordRun({
        kind: historyKind,
        title: pageTitle,
        model: selectedModel.id,
        provider: response.provider,
        status: response.status,
        imageUrl: response.image_url,
        sourceImageUrl: response.source_image_url ?? uploadedPreviewUrl ?? selectedAssets[0]?.previewUrl ?? selectedAssets[0]?.storageUrl ?? null,
        prompt,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : submitErrorLabel);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack compact-page split-page">
      <section className="panel compact-panel">
        <div className="dashboard-grid result-heavy image-edit-layout">
          <div className="form-card parameter-scroll-panel image-edit-form compact-parameter-panel">
            <AssetSourcePicker
              title={sourcePickerTitle}
              assetItems={assetItems}
              uploadLabel={uploadLabel}
              onUploadFilesChange={setFiles}
              onSelectedAssetsChange={setSelectedAssets}
            />

            <label className="input-group compact-input-group">
              <span>模型</span>
              <select value={model} onChange={(event) => setModel(event.target.value)} disabled={models.length === 0}>
                {models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              {modelError ? <small>{modelError}</small> : selectedModel ? <small>{selectedModel.pricing_hint}</small> : null}
            </label>

            <label className="input-group prompt-input-group compact-prompt-group">
              <div className="prompt-input-header compact-prompt-header">
                <span>{promptLabel}</span>
                <PromptTemplateImporter templates={templates} onImport={setPrompt} />
              </div>
              <AutoResizeTextarea className="prompt-textarea" rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            </label>

            {error ? <p className="error-text">{error}</p> : null}

            <button className="primary-button align-start" type="button" onClick={handleSubmit} disabled={loading || !selectedModel}>
              {loading ? loadingLabel : submitLabel}
            </button>
          </div>

          <div className="preview-history-layout">
            <div className="stack-list preview-history-main">
              <details className="drawer-panel" open>
                <summary className="drawer-summary compact-drawer-summary">
                  <div>
                    <h4>结果预览</h4>
                  </div>
                  <span className="drawer-hint">展开 / 收起</span>
                </summary>
                <div className="drawer-content">
                  <div className="result-preview-pane result-preview-pane-single">
                    <span>{resultLabel}</span>
                    <div
                      className={previewResultUrl ? "generated-result-card compare image-edit-result-card interactive-result-card" : "generated-result-card compare image-edit-result-card"}
                      role={previewResultUrl ? "button" : undefined}
                      tabIndex={previewResultUrl ? 0 : undefined}
                      onClick={previewResultUrl ? () => setPreviewOpen(true) : undefined}
                    >
                      {previewResultUrl ? <img className="generated-image image-fit-contain interactive-preview-image" src={previewResultUrl} alt={resultLabel} /> : <div className="compare-card after" />}
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <PageGenerationHistory
              title={historyTitle}
              items={pageRuns}
              activeId={selectedHistoryId}
              onPreview={(item) => setSelectedHistoryId(item.id)}
              onDeleteHistory={onDeleteHistory}
            />
          </div>
        </div>
      </section>

      {previewOpen ? (
        <ResultPreviewModal
          title={previewTitle}
          sourceUrl={previewSourceUrl}
          sourceLabel="原始图"
          resultUrl={previewResultUrl}
          resultLabel={resultLabel}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
