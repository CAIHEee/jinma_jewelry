import { useEffect, useMemo, useState } from "react";

import { AssetSourcePicker } from "../components/AssetSourcePicker";
import { FloatingToast } from "../components/FloatingToast";
import { ResultPreviewModal } from "../components/ResultPreviewModal";
import { assetItemToFile, submitRemoveBackground } from "../services/api";
import type { AssetItem } from "../types/mockData";

interface RemoveBackgroundPageProps {
  assetItems: AssetItem[];
}

function buildWhiteDownloadName(sourceName: string | null) {
  const fallback = "remove-background-white.png";
  if (!sourceName) return fallback;
  const normalized = sourceName.trim();
  if (!normalized) return fallback;
  const dotIndex = normalized.lastIndexOf(".");
  const stem = dotIndex > 0 ? normalized.slice(0, dotIndex) : normalized;
  return `${stem}_white.png`;
}

export function RemoveBackgroundPage({ assetItems }: RemoveBackgroundPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<AssetItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadName, setDownloadName] = useState("remove-background-white.png");

  const uploadedPreviewUrl = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files]);
  const sourcePreviewUrl = uploadedPreviewUrl ?? selectedAssets[0]?.previewUrl ?? selectedAssets[0]?.storageUrl ?? selectedAssets[0]?.fileUrl ?? null;

  useEffect(() => {
    return () => {
      if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
    };
  }, [uploadedPreviewUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  async function handleRemoveBackground() {
    if (processing) {
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      const file = files[0] ?? (selectedAssets[0] ? await assetItemToFile(selectedAssets[0]) : null);
      if (!file) {
        throw new Error("请先选择一张待去背景图片。");
      }

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const whiteBlob = await submitRemoveBackground({ file });
      if (!whiteBlob.size) {
        throw new Error("去除背景完成，但没有返回有效图片，请稍后重试。");
      }

      setResultUrl(URL.createObjectURL(whiteBlob));
      setDownloadName(buildWhiteDownloadName(file.name));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "去除背景失败");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="page-stack compact-page split-page">
      <FloatingToast message={error} />
      <section className="panel compact-panel">
        <div className="dashboard-grid result-heavy image-edit-layout">
          <div className="form-card parameter-scroll-panel image-edit-form compact-parameter-panel">
            <AssetSourcePicker
              title="选择待去背景图片"
              assetItems={assetItems}
              uploadLabel="上传待处理图片"
              onUploadFilesChange={setFiles}
              onSelectedAssetsChange={setSelectedAssets}
            />

            <div className="hint-box remove-bg-hint-box">
              该工具由服务器临时处理图片，不保存历史记录，也不会写入资产库。输出结果为白色背景图片，可直接下载使用。
            </div>

            <div className="inline-action-row">
              <button className="primary-button align-start" type="button" onClick={handleRemoveBackground} disabled={processing || !sourcePreviewUrl}>
                {processing ? "去背景中..." : "一键去背景"}
              </button>
              {resultUrl ? (
                <a className="secondary-button compact-button" href={resultUrl} download={downloadName}>
                  下载白底图
                </a>
              ) : null}
            </div>
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
                    <span>白底结果</span>
                    <div
                      className={resultUrl ? "generated-result-card compare image-edit-result-card interactive-result-card remove-bg-result-card" : "generated-result-card compare image-edit-result-card remove-bg-result-card"}
                      role={resultUrl ? "button" : undefined}
                      tabIndex={resultUrl ? 0 : undefined}
                      onClick={resultUrl ? () => setPreviewOpen(true) : undefined}
                    >
                      {resultUrl ? (
                        <div className="remove-bg-preview-surface">
                          <img className="generated-image image-fit-contain interactive-preview-image" src={resultUrl} alt="去背景结果" />
                        </div>
                      ) : (
                        <div className="remove-bg-empty-state">
                          <p>上传或选择一张图片后，可由服务器临时去除背景并返回白底图。</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {previewOpen && resultUrl ? (
        <ResultPreviewModal title="去除背景预览" sourceUrl={sourcePreviewUrl} sourceLabel="原始图" resultUrl={resultUrl} resultLabel="白底结果" onClose={() => setPreviewOpen(false)} />
      ) : null}
    </div>
  );
}
