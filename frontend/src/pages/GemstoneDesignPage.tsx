import { ReferenceTransformModulePage } from "../components/ReferenceTransformModulePage";
import type { AssetItem } from "../types/mockData";
import type { WorkspaceRun } from "../types/workspace";
import type { ModuleHistoryEntry } from "../utils/history";

interface GemstoneDesignPageProps {
  assetItems: AssetItem[];
  onRecordRun: (run: Omit<WorkspaceRun, "id" | "createdAt">) => void;
  pageRuns: ModuleHistoryEntry[];
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
}

export function GemstoneDesignPage(props: GemstoneDesignPageProps) {
  return (
    <ReferenceTransformModulePage
      {...props}
      pageTitle="裸石设计"
      historyTitle="裸石设计历史"
      previewTitle="裸石设计预览"
      resultLabel="裸石结果"
      sourcePickerTitle="选择裸石设计来源"
      uploadLabel="上传裸石参考图"
      promptLabel="裸石提示词"
      submitLabel="生成裸石方案"
      loadingLabel="生成中..."
      emptyModelError="当前没有可用的裸石设计模型。"
      emptyAssetError="请先选择一张裸石参考图。"
      submitErrorLabel="裸石设计失败"
      feature="gemstone_design"
      module="gemstone-design"
      historyKind="gemstone_design"
      endpointPath="/ai/gemstone-design"
      defaultPrompt="基于参考图设计更完整的裸石展示方案，强化宝石轮廓、切面逻辑、通透感、火彩与展示效果，输出适合珠宝选石与方案确认的高质量裸石图。"
    />
  );
}
