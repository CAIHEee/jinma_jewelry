import { useEffect, useMemo, useState } from "react";

import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { AssetSourcePicker } from "./AssetSourcePicker";
import { FloatingToast } from "./FloatingToast";
import { GenerationProgress } from "./GenerationProgress";
import { PageGenerationHistory } from "./PageGenerationHistory";
import { PromptTemplateImporter } from "./PromptTemplateImporter";
import { ResultPreviewModal } from "./ResultPreviewModal";
import { getPromptTemplatesByModule } from "../data/promptTemplates";
import { useModelCatalog } from "../hooks/useModelCatalog";
import { submitReferenceModuleTransform } from "../services/api";
import type { GenerationJobProgress, GenerationResult } from "../types/fusion";
import type { AssetItem } from "../types/mockData";
import type { PromptTemplate } from "../types/prompts";
import type { WorkspaceRun } from "../types/workspace";
import { buildGenerationJobProgress } from "../utils/jobProgress";
import type { ModuleHistoryEntry } from "../utils/history";
import type { GenerationProgressPhase } from "./GenerationProgress";

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
  defaultPrompt?: string;
  allowMultipleSources?: boolean;
  hideModelSelector?: boolean;
  hidePromptEditor?: boolean;
  imageSize?: "1K" | "2K";
  progressPhases?: GenerationProgressPhase[];
  successLabel?: string;
  errorProgressLabel?: string;
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
  allowMultipleSources = false,
  hideModelSelector = false,
  hidePromptEditor = false,
  imageSize = "1K",
  progressPhases,
  successLabel = "已完成",
  errorProgressLabel = "生成失败",
}: ReferenceTransformModulePageProps) {
  const templates = getPromptTemplatesByModule(module);
  const initialPrompt = hidePromptEditor
    ? (defaultPrompt ?? "")
    : (defaultPrompt !== undefined ? defaultPrompt : (templates[0]?.content ?? ""));
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
  const [progressState, setProgressState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [jobProgress, setJobProgress] = useState<GenerationJobProgress | null>(null);

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
  const previewSourceUrl = useMemo(() => {
    const historySourceUrl = activeHistory?.sourceImageUrl ?? null;
    if (historySourceUrl && historySourceUrl !== previewResultUrl) {
      return historySourceUrl;
    }
    const historySourceImage = activeHistory?.sourceImages[0] ?? null;
    if (historySourceImage && historySourceImage !== previewResultUrl) {
      return historySourceImage;
    }
    return uploadedPreviewUrl ?? selectedAssets[0]?.previewUrl ?? selectedAssets[0]?.storageUrl ?? null;
  }, [activeHistory, previewResultUrl, selectedAssets, uploadedPreviewUrl]);

  useEffect(() => {
    return () => {
      if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
    };
  }, [uploadedPreviewUrl]);

  async function handleSubmit() {
    if (loading) {
      return;
    }
    if (!selectedModel) {
      setError(emptyModelError);
      return;
    }
    if (files.length === 0 && selectedAssets.length === 0) {
      setError(emptyAssetError);
      return;
    }
    if (!hidePromptEditor && !prompt.trim()) {
      setError(`请输入${promptLabel}。`);
      return;
    }

    setLoading(true);
    setError(null);
    setProgressState("running");
    setJobProgress({ percent: 18, label: `${pageTitle}任务排队中...` });
    try {
      const selectedAssetUrls = selectedAssets
        .map((asset) => asset.fileUrl ?? asset.previewUrl ?? asset.storageUrl ?? null)
        .filter((url): url is string => Boolean(url));
      const selectedAssetNames = selectedAssets.map((asset) => asset.name);
      const inputFiles = allowMultipleSources ? files : files.slice(0, 1);
      const selectedAsset = selectedAssets[0] ?? null;
      const selectedAssetUrl = selectedAssetUrls[0] ?? null;
      const inputFile = inputFiles[0] ?? null;
      if (inputFiles.length === 0 && selectedAssetUrls.length === 0) throw new Error("未获取到可用参考图");

      const response = await submitReferenceModuleTransform(endpointPath, {
        files: allowMultipleSources ? inputFiles : undefined,
        file: allowMultipleSources ? undefined : inputFile,
        sourceImageUrls: allowMultipleSources && inputFiles.length === 0 ? selectedAssetUrls : undefined,
        sourceImageNames: allowMultipleSources && inputFiles.length === 0 ? selectedAssetNames : undefined,
        sourceImageUrl: !allowMultipleSources && !inputFile ? selectedAssetUrl ?? undefined : undefined,
        sourceImageName: !allowMultipleSources && !inputFile ? selectedAsset?.name : undefined,
        model: selectedModel.id,
        prompt,
        feature,
        imageSize,
      }, {
        onJobUpdate: (job) =>
          setJobProgress(
            buildGenerationJobProgress(job, {
              queued: `${pageTitle}任务排队中...`,
              running: progressPhases?.[2]?.label ?? `${pageTitle}生成中...`,
              uploading: `正在整理并保存${pageTitle}结果...`,
              succeeded: "已完成",
              failed: submitErrorLabel,
            }),
          ),
      });
      if (!response.image_url) {
        throw new Error("生成完成，但没有返回结果图片，请稍后重试。");
      }

      setResult(response);
      setSelectedHistoryId(null);
      onRecordRun({
        kind: historyKind,
        title: pageTitle,
        model: selectedModel.id,
        provider: response.provider,
        status: response.status,
        imageUrl: response.image_url,
        sourceImageUrl: response.source_image_url ?? uploadedPreviewUrl ?? selectedAssetUrls[0] ?? null,
        sourceImages:
          inputFiles.length > 0
            ? uploadedPreviewUrl
              ? [uploadedPreviewUrl]
              : []
            : selectedAssetUrls,
        prompt: prompt.trim(),
      });
      setJobProgress({ percent: 100, label: "已完成" });
      setProgressState("success");
    } catch (submitError) {
      setLoading(false);
      setProgressState("error");
      setJobProgress({
        percent: 100,
        label: submitError instanceof Error ? submitError.message : submitErrorLabel,
      });
      setError(submitError instanceof Error ? submitError.message : submitErrorLabel);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="page-stack compact-page split-page">
      <FloatingToast message={error} />
      <section className="panel compact-panel">
        <div className="dashboard-grid result-heavy image-edit-layout">
          <div className="form-card parameter-scroll-panel image-edit-form compact-parameter-panel">
            {!hideModelSelector ? (
              <label className="input-group compact-input-group">
                <span>模型</span>
                <select value={model} onChange={(event) => setModel(event.target.value)} disabled={models.length === 0}>
                  {models.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {modelError ? <small>{modelError}</small> : null}
              </label>
            ) : null}

            <AssetSourcePicker
              title={sourcePickerTitle}
              assetItems={assetItems}
              allowMultiple={allowMultipleSources}
              uploadLabel={uploadLabel}
              onUploadFilesChange={setFiles}
              onSelectedAssetsChange={setSelectedAssets}
            />

            {!hidePromptEditor ? (
              <label className="input-group prompt-input-group compact-prompt-group">
                <div className="prompt-input-header compact-prompt-header">
                  <span>{promptLabel}</span>
                  <PromptTemplateImporter templates={templates} onImport={setPrompt} />
                </div>
                <AutoResizeTextarea className="prompt-textarea" rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              </label>
            ) : null}

            <GenerationProgress
              state={progressState}
              phases={progressPhases}
              successLabel={successLabel}
              errorLabel={errorProgressLabel}
              progressValue={jobProgress?.percent ?? null}
              progressLabel={jobProgress?.label ?? null}
            />

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
