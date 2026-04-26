import type { PromptTemplate } from "../types/prompts";

export const promptTemplates: PromptTemplate[] = [
  {
    id: "text-to-image-edwardian-ring",
    title: "文生图：爱德华风戒指",
    module: "text-to-image",
    content:
      "爱德华风格戒指，18K玫瑰金，心形切割红宝石作为主石，六爪镶嵌，戒臂带有莲花浮雕纹样，金属表面为缎面处理，边缘排布微镶钻石，戒肩有花丝工艺细节，高级珠宝产品渲染效果，背景干净，金属光泽真实，工艺细节清晰。",
  },
  {
    id: "text-to-image-pendant",
    title: "文生图：吊坠方案",
    module: "text-to-image",
    content:
      "高级珠宝吊坠概念图，祖母绿主石，优雅金属边框，细致爪镶，对称轮廓，高级产品摄影风格，柔和棚拍光线，白色哑光背景，构图简洁，工艺细节丰富。",
    note: "适合快速生成首版概念稿。",
  },
  {
    id: "multi-view-jewelry-grid",
    title: "多视图：四视图珠宝板",
    module: "multi-view",
    content:
      "基于参考图生成四个标准视角：正视、左视、右视、背视。保持各视图在结构、材质、工艺与比例上完全统一，以干净的 2x2 布局呈现，背景为纯白哑光，棚拍光线，细节清晰，不允许出现任何支撑结构。",
  },
  {
    id: "sketch-to-realistic-default",
    title: "线稿转写实",
    module: "image-edit",
    content:
      "将参考线稿图转换风格为现实写实成品图，玉石还原天然玉石翡翠的真实质感，天然玉石的温润光泽，透光程度与自然纹理，无塑料感、玻璃感，颜色过渡自然，无过度饱和，需与参考图玉石颜色一致。金属还原亮面抛光质感，呈现真实的温润金属光泽，边缘高光与阴影过渡自然，无过曝发黑、无CG感，精准复现参考图中的每一颗钻石，呈现天然白钻的清晰刻面、真实火彩与颗粒分明的质感，无模糊融合、无失真变形，棚拍光线、真实自然光影，禁止过度饱和和过度曝光，自然背景和高级商业珠宝摄影质感，成品图需与参考图的珠宝设计细节一致。",
  },
  {
    id: "grayscale-relief-clay",
    title: "转灰度图：哑光灰模",
    module: "grayscale-relief",
    content:
      "严格保留参考图的结构、比例与雕塑细节，将其渲染为哑光灰度泥模效果。不要金属反光，不要宝石折射，仅保留轻微 AO 阴影，背景为深色哑光，整体呈现清晰的拓扑感。",
  },
  {
    id: "product-refine-jewelry-shot",
    title: "产品精修：电商精修图",
    module: "product-refine",
    content:
      "将这张珠宝产品图精修为更高级的商业主视觉。保持原始设计和宝石布局不变，优化金属抛光、宝石通透感、边缘清洁度、光线平衡与整体展示质感，同时保持真实感。",
  },
  {
    id: "gemstone-design-cabochon",
    title: "裸石设计：祖母绿主石方案",
    module: "gemstone-design",
    content:
      "以参考图内全部裸石为基础进行合理的人工珠宝设计，不改变任何裸石的形状、大小比例，采用精致金属材质进行镶嵌与装饰，对每颗裸石进行美学化、对称化布局，设计结构合理，不得添加其它参考图以外的玉石、细节完整、光影精致的珠宝成品设计图。",
  },
  {
    id: "upscale-jewelry-clean",
    title: "高清放大：细节增强",
    module: "upscale",
    content:
      "在不改变原始构图的前提下，对这张珠宝图进行高清放大与细节增强。提升边缘清晰度、宝石细节、金属纹理、刻纹清晰度和整体分辨率，同时保持设计不变。",
  },
  {
    id: "fusion-jewelry-merge",
    title: "多图融合：结构与风格融合",
    module: "fusion",
    content:
      "将所有参考图中的结构、主石语言与细节特征融合成一张统一的珠宝概念图。保留主参考图最明确的轮廓，同时吸收其他参考图中的高级工艺细节，输出干净、优雅、可直接用于方案展示的结果。",
  },
];

export function getPromptTemplatesByModule(module: PromptTemplate["module"]): PromptTemplate[] {
  return promptTemplates.filter((item) => item.module === module);
}
