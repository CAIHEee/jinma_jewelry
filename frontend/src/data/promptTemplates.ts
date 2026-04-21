import type { PromptTemplate } from "../types/prompts";

export const promptTemplates: PromptTemplate[] = [
  {
    id: "text-to-image-edwardian-ring",
    title: "文生图：爱德华风戒指",
    module: "text-to-image",
    english:
      "Edwardian style ring, 18K rose gold, heart-cut ruby as the center stone, six-prong setting, lotus-inspired relief engraving on the band, satin-finished metal surface, micro-pave diamonds along the edges, filigree detail on the shoulders, high-end jewelry product rendering, clean background, realistic metal luster, sharp craftsmanship details.",
    chinese:
      "爱德华风格戒指，18K玫瑰金，心形切割红宝石作为主石，六爪镶嵌，戒臂带有莲花浮雕纹样，金属表面为缎面处理，边缘排布微镶钻石，戒肩有花丝工艺细节，高级珠宝产品渲染效果，背景干净，金属光泽真实，工艺细节清晰。",
    note: "Flux 文生图建议优先使用英文提示词。",
  },
  {
    id: "text-to-image-pendant",
    title: "文生图：吊坠方案",
    module: "text-to-image",
    english:
      "Luxury jewelry pendant concept, emerald center stone, elegant gold frame, fine claw setting, symmetrical silhouette, premium product photography style, soft studio lighting, white matte background, clean composition, highly detailed craftsmanship.",
    chinese:
      "高级珠宝吊坠概念图，祖母绿主石，优雅金属边框，细致爪镶，对称轮廓，高级产品摄影风格，柔和棚拍光线，白色哑光背景，构图简洁，工艺细节丰富。",
    note: "适合快速生成首版概念稿。",
  },
  {
    id: "multi-view-jewelry-grid",
    title: "多视图：四视图珠宝板",
    module: "multi-view",
    english:
      "Generate four standard views from the reference image: front, left, right, and back. Keep all views consistent in structure, material, craftsmanship, and proportions. Arrange them in a clean 2x2 layout, with pure white matte background, studio lighting, sharp detail, and no support structures.",
    chinese:
      "基于参考图生成四个标准视角：正视、左视、右视、背视。保持各视图在结构、材质、工艺与比例上完全统一，以干净的 2x2 布局呈现，背景为纯白哑光，棚拍光线，细节清晰，不允许出现任何支撑结构。",
    note: "Flux 多视图建议优先使用英文提示词。",
  },
  {
    id: "sketch-to-realistic-product",
    title: "线稿转写实：珠宝产品图",
    module: "image-edit",
    english:
      "Transform this jewelry line sketch into a realistic high-end jewelry product rendering. Preserve the original silhouette, stone placement, prong structure, and design proportions. Add polished precious metal, realistic gemstone material, soft studio lighting, clean background, and premium commercial photography quality.",
    chinese:
      "将这张珠宝线稿转换为写实高级珠宝产品图。保留原始轮廓、宝石位置、镶口结构和设计比例，加入抛光贵金属、真实宝石材质、柔和棚拍光线、干净背景和高级商业摄影质感。",
    note: "Flux / Kontext 线稿转写实建议优先使用英文提示词。",
  },
  {
    id: "sketch-to-realistic-concept",
    title: "线稿转写实：概念提案图",
    module: "image-edit",
    english:
      "Convert the jewelry design sketch into a realistic concept image while keeping the hand-drawn design intent. Maintain the main outline and structural logic, add refined metal surfaces, gemstone clarity, accurate shadows, and a clean presentation suitable for client review.",
    chinese:
      "将珠宝设计草图转换为写实概念图，同时保留手绘设计意图。保持主要轮廓和结构逻辑，加入精致金属表面、宝石通透感、准确阴影和适合客户评审的干净展示效果。",
    note: "适合从草图快速转成客户可理解的写实方案。",
  },
  {
    id: "grayscale-relief-clay",
    title: "转灰度图：哑光灰模",
    module: "grayscale-relief",
    english:
      "Strictly preserve the exact structure, proportions, and sculptural details of the reference image. Render it as a matte grayscale clay model with no metal reflection, no gemstone refraction, subtle AO shading only, dark matte background, and crisp topology-like presentation.",
    chinese:
      "严格保留参考图的结构、比例与雕塑细节，将其渲染为哑光灰度泥模效果。不要金属反光，不要宝石折射，仅保留轻微 AO 阴影，背景为深色哑光，整体呈现清晰的拓扑感。",
    note: "灰度立体化若走 Flux / Kontext，建议直接使用英文版。",
  },
  {
    id: "product-refine-jewelry-shot",
    title: "产品精修：电商精修图",
    module: "product-refine",
    english:
      "Refine this jewelry product image into a premium commercial hero shot. Keep the original design and gemstone layout, improve metal polish, gemstone clarity, edge cleanup, lighting balance, and overall presentation quality while preserving realism.",
    chinese:
      "将这张珠宝产品图精修为更高级的商业主视觉。保持原始设计和宝石布局不变，优化金属抛光、宝石通透感、边缘清洁度、光线平衡与整体展示质感，同时保持真实感。",
  },
  {
    id: "gemstone-design-cabochon",
    title: "裸石设计：祖母绿主石方案",
    module: "gemstone-design",
    english:
      "Design a premium loose gemstone concept based on the reference image, focusing on stone contour, polish, translucency, surface luster, and collectible presentation. Keep the gemstone as the visual subject with clean studio background.",
    chinese:
      "基于参考图设计高级裸石方案，重点表现宝石轮廓、抛光、通透感、表面光泽与收藏级展示效果。以裸石本身为主体，背景保持干净的棚拍展示环境。",
  },
  {
    id: "upscale-jewelry-clean",
    title: "高清放大：细节增强",
    module: "upscale",
    english:
      "Upscale and enhance this jewelry image while preserving original composition. Improve edge sharpness, gemstone detail, metal texture, engraving clarity, and overall resolution without changing the design.",
    chinese:
      "在不改变原始构图的前提下，对这张珠宝图进行高清放大与细节增强。提升边缘清晰度、宝石细节、金属纹理、刻纹清晰度和整体分辨率，同时保持设计不变。",
  },
  {
    id: "fusion-jewelry-merge",
    title: "多图融合：结构与风格融合",
    module: "fusion",
    english:
      "Blend the structure, center stone language, and detail cues from all references into one coherent jewelry concept image. Preserve the strongest silhouette from the primary reference, merge premium craftsmanship details from the secondary references, and keep the result clean, elegant, and commercially usable.",
    chinese:
      "将所有参考图中的结构、主石语言与细节特征融合成一张统一的珠宝概念图。保留主参考图最明确的轮廓，同时吸收其他参考图中的高级工艺细节，输出干净、优雅、可直接用于方案展示的结果。",
    note: "多图融合在 Flux 模型下同样建议优先使用英文。",
  },
];

export function getPromptTemplatesByModule(module: PromptTemplate["module"]): PromptTemplate[] {
  return promptTemplates.filter((item) => item.module === module);
}
