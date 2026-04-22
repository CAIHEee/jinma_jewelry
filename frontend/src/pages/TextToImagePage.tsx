import { useEffect, useMemo, useState } from "react";

import { AutoResizeTextarea } from "../components/AutoResizeTextarea";
import { GenerationProgress } from "../components/GenerationProgress";
import { PageGenerationHistory } from "../components/PageGenerationHistory";
import { PromptTemplateImporter } from "../components/PromptTemplateImporter";
import { ResultPreviewModal } from "../components/ResultPreviewModal";
import { getPromptTemplatesByModule } from "../data/promptTemplates";
import { useModelCatalog } from "../hooks/useModelCatalog";
import { submitTextToImage } from "../services/api";
import type { GenerationResult } from "../types/fusion";
import type { WorkspaceRun } from "../types/workspace";
import type { ModuleHistoryEntry } from "../utils/history";

interface TextToImagePageProps {
  onRecordRun: (run: Omit<WorkspaceRun, "id" | "createdAt">) => void;
  pageRuns: ModuleHistoryEntry[];
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
}

const templates = getPromptTemplatesByModule("text-to-image");
const progressPhases = [
  { at: 20, label: "整理提示词..." },
  { at: 42, label: "提交文生图请求..." },
  { at: 76, label: "珠宝效果生成中..." },
  { at: 95, label: "回传高清结果..." },
];

export function TextToImagePage({ onRecordRun, pageRuns, onDeleteHistory }: TextToImagePageProps) {
  const { models, error: modelError, defaultModelId } = useModelCatalog((model) => model.supports_text_to_image);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(defaultModelId);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageSize, setImageSize] = useState("1K");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressState, setProgressState] = useState<"idle" | "running" | "success" | "error">("idle");

  useEffect(() => {
    if (!models.length) {
      return;
    }
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
  const selectedHistory = useMemo(() => pageRuns.find((item) => item.id === selectedHistoryId) ?? null, [pageRuns, selectedHistoryId]);
  const activeHistory = selectedHistory ?? (!result ? pageRuns[0] ?? null : null);
  const previewResultUrl = activeHistory?.imageUrl ?? result?.image_url ?? null;

  async function handleGenerate() {
    if (!selectedModel) {
      setError("当前没有可用的文生图模型。");
      return;
    }

    setLoading(true);
    setError(null);
    setProgressState("running");

    try {
      const response = await submitTextToImage({
        prompt,
        model: selectedModel.id,
        aspect_ratio: aspectRatio,
        size: "1024x1024",
        image_size: imageSize,
      });

      setResult(response);
      setSelectedHistoryId(null);
      onRecordRun({
        kind: "text_to_image",
        title: "文生图",
        model: selectedModel.id,
        provider: response.provider,
        status: response.status,
        imageUrl: response.image_url,
        prompt,
      });
      setProgressState("success");
    } catch (submitError) {
      setProgressState("error");
      setError(submitError instanceof Error ? submitError.message : "图片生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack compact-page split-page">
      <section className="panel compact-panel">
        <div className="dashboard-grid result-heavy single-result-layout">
          <div className="form-card parameter-scroll-panel text-to-image-form compact-parameter-panel">
            <label className="input-group compact-input-group text-to-image-model-row">
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

            <div className="dense-grid text-to-image-meta-row compact-meta-row">
              <label className="input-group compact-input-group">
                <span>画幅比例</span>
                <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="16:9">16:9</option>
                  <option value="3:4">3:4</option>
                </select>
              </label>

              <label className="input-group compact-input-group">
                <span>输出尺寸</span>
                <select value={imageSize} onChange={(event) => setImageSize(event.target.value)}>
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                </select>
              </label>
            </div>

            <label className="input-group prompt-input-group compact-prompt-group">
              <div className="prompt-input-header compact-prompt-header">
                <span>提示词</span>
                <PromptTemplateImporter templates={templates} onImport={setPrompt} />
              </div>
              <AutoResizeTextarea className="prompt-textarea" rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            </label>

            {error ? <p className="error-text">{error}</p> : null}
            <GenerationProgress state={progressState} phases={progressPhases} successLabel="图片已完成" errorLabel="文生图失败" />

            <button className="primary-button align-start" type="button" onClick={handleGenerate} disabled={loading || !selectedModel}>
              {loading ? "生成中..." : "生成图片"}
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
                    <span>生成结果</span>
                    {previewResultUrl ? (
                      <div
                        className="generated-result-card compare image-edit-result-card interactive-result-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => setPreviewOpen(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setPreviewOpen(true);
                          }
                        }}
                      >
                        <img className="generated-image image-fit-contain interactive-preview-image" src={previewResultUrl} alt="生成结果" />
                      </div>
                    ) : (
                      <div className="generated-result-card placeholder compare image-edit-result-card">
                        <p>提交任务后，这里会显示返回图片。</p>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>

            <PageGenerationHistory
              title="文生图历史"
              items={pageRuns}
              activeId={selectedHistoryId}
              onPreview={(item) => setSelectedHistoryId(item.id)}
              onDeleteHistory={onDeleteHistory}
            />
          </div>
        </div>
      </section>

      {previewOpen ? <ResultPreviewModal title="文生图结果预览" resultUrl={previewResultUrl} resultLabel="生成结果" onClose={() => setPreviewOpen(false)} /> : null}
    </div>
  );
}
