import { useEffect, useMemo, useState } from "react";

import { AutoResizeTextarea } from "../components/AutoResizeTextarea";
import { AssetSourcePicker } from "../components/AssetSourcePicker";
import { PageGenerationHistory } from "../components/PageGenerationHistory";
import { PromptTemplateImporter } from "../components/PromptTemplateImporter";
import { ResultPreviewModal } from "../components/ResultPreviewModal";
import { getPromptTemplatesByModule } from "../data/promptTemplates";
import { useModelCatalog } from "../hooks/useModelCatalog";
import { submitMultiViewGeneration } from "../services/api";
import type { GenerationResult } from "../types/fusion";
import type { AssetItem } from "../types/mockData";
import type { WorkspaceRun } from "../types/workspace";
import type { ModuleHistoryEntry } from "../utils/history";

interface MultiViewPageProps {
  assetItems: AssetItem[];
  onRecordRun: (run: Omit<WorkspaceRun, "id" | "createdAt">) => void;
  pageRuns: ModuleHistoryEntry[];
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
}

const multiViewTemplates = getPromptTemplatesByModule("multi-view");
const defaultPrompt =
  multiViewTemplates[0]?.chinese ??
  "基于参考图生成珠宝多视图单图，统一结构、材质、工艺与比例，以四宫格形式输出。";

export function MultiViewPage({ assetItems, onRecordRun, pageRuns, onDeleteHistory }: MultiViewPageProps) {
  const { models, error: modelError, defaultModelId } = useModelCatalog((model) => model.supports_reference_images);
  const [model, setModel] = useState(defaultModelId);
  const [multiViewPrompt, setMultiViewPrompt] = useState(defaultPrompt);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<AssetItem[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!models.length) return;
    if (!model || !models.some((item) => item.id === model)) {
      setModel(defaultModelId);
    }
  }, [defaultModelId, model, models]);

  useEffect(() => {
    if (result || selectedHistoryId || pageRuns.length === 0) {
      return;
    }
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
      if (uploadedPreviewUrl) {
        URL.revokeObjectURL(uploadedPreviewUrl);
      }
    };
  }, [uploadedPreviewUrl]);

  async function handleGenerate() {
    if (!selectedModel) {
      setError("当前没有可用的多视图模型。");
      return;
    }

    if (files.length === 0 && selectedAssets.length === 0) {
      setError("请先选择一张参考图。");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedAsset = selectedAssets[0] ?? null;
      const selectedAssetUrl = selectedAsset?.fileUrl ?? selectedAsset?.previewUrl ?? selectedAsset?.storageUrl ?? null;
      const inputFile = files[0] ?? null;
      if (!inputFile && !selectedAssetUrl) {
        throw new Error("未获取到可用参考图");
      }

      const response = await submitMultiViewGeneration({
        file: inputFile,
        sourceImageUrl: inputFile ? undefined : selectedAssetUrl ?? undefined,
        sourceImageName: inputFile ? undefined : selectedAsset?.name,
        model: selectedModel.id,
        prompt: multiViewPrompt,
        feature: "multi_view",
      });

      setResult(response);
      setSelectedHistoryId(null);
      onRecordRun({
        kind: "multi_view",
        title: `生成多视图：${selectedModel.label}`,
        model: selectedModel.id,
        provider: response.provider,
        status: response.status,
        imageUrl: response.image_url,
        sourceImageUrl: response.source_image_url ?? uploadedPreviewUrl ?? selectedAssets[0]?.previewUrl ?? selectedAssets[0]?.storageUrl ?? null,
        prompt: multiViewPrompt,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "多视图生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack compact-page split-page multi-view-page">
      <section className="panel compact-panel">
        <div className="dashboard-grid result-heavy">
          <div className="form-card parameter-scroll-panel compact-parameter-panel">
            <AssetSourcePicker
              title="选择多视图来源"
              assetItems={assetItems}
              uploadLabel="上传多视图参考图"
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
                <span>多视图提示词</span>
                <PromptTemplateImporter templates={multiViewTemplates} onImport={setMultiViewPrompt} />
              </div>
              <AutoResizeTextarea className="prompt-textarea" rows={3} value={multiViewPrompt} onChange={(event) => setMultiViewPrompt(event.target.value)} />
            </label>

            {error ? <p className="error-text">{error}</p> : null}

            <button className="primary-button align-start" type="button" onClick={handleGenerate} disabled={loading || !selectedModel}>
              {loading ? "生成中..." : "生成多视图单图"}
            </button>
          </div>

          <div className="preview-history-layout multi-view-preview-layout">
            <div className="stack-list preview-history-main multi-view-preview-main">
              <details className="drawer-panel" open>
                <summary className="drawer-summary compact-drawer-summary">
                  <div>
                    <h4>结果预览</h4>
                  </div>
                  <span className="drawer-hint">展开 / 收起</span>
                </summary>
                <div className="drawer-content">
                  <div className="result-preview-pane result-preview-pane-single">
                    <span>多视图结果</span>
                    <div
                      className={previewResultUrl ? "generated-result-card compare multi-view-result-card interactive-result-card" : "generated-result-card compare multi-view-result-card"}
                      role={previewResultUrl ? "button" : undefined}
                      tabIndex={previewResultUrl ? 0 : undefined}
                      onClick={previewResultUrl ? () => setPreviewOpen(true) : undefined}
                    >
                      {previewResultUrl ? <img className="generated-image image-fit-contain interactive-preview-image" src={previewResultUrl} alt="多视图结果" /> : <div className="multi-view-single-card">四宫格结果图</div>}
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <PageGenerationHistory
              title="多视图历史"
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
          title="多视图结果预览"
          sourceUrl={previewSourceUrl}
          sourceLabel="原始图"
          resultUrl={previewResultUrl}
          resultLabel="多视图结果"
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
