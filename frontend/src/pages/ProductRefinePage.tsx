import { ReferenceTransformModulePage } from "../components/ReferenceTransformModulePage";
import type { AssetItem } from "../types/mockData";
import type { WorkspaceRun } from "../types/workspace";
import type { ModuleHistoryEntry } from "../utils/history";

interface ProductRefinePageProps {
  assetItems: AssetItem[];
  onRecordRun: (run: Omit<WorkspaceRun, "id" | "createdAt">) => void;
  pageRuns: ModuleHistoryEntry[];
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
}

export function ProductRefinePage(props: ProductRefinePageProps) {
  return (
    <ReferenceTransformModulePage
      {...props}
      pageTitle="产品精修"
      historyTitle="产品精修历史"
      previewTitle="产品精修预览"
      resultLabel="精修结果"
      sourcePickerTitle="选择产品精修来源"
      uploadLabel="上传产品图"
      promptLabel="精修提示词"
      submitLabel="生成精修图"
      loadingLabel="精修中..."
      emptyModelError="当前没有可用的产品精修模型。"
      emptyAssetError="请先选择一张产品图。"
      submitErrorLabel="产品精修失败"
      feature="product_refine"
      module="product-refine"
      historyKind="product_refine"
      endpointPath="/ai/product-refine"
      allowMultipleSources
      defaultPrompt=""
    />
  );
}
