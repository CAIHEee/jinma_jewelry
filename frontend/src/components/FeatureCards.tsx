const features = [
  {
    title: "草图与参考图上传",
    description: "收集后续生图、融合与设计迭代所需的基础素材。",
  },
  {
    title: "多图融合",
    description: "选择主参考图、设定融合模式，并生成新的融合概念图。",
  },
  {
    title: "AI 图像精修",
    description: "通过受控编辑和提示词调整，不断优化已选结果。",
  },
  {
    title: "历史与任务跟踪",
    description: "跟踪版本、回看旧产物，并为后续任务队列打通数据链路。",
  },
];

export function FeatureCards() {
  return (
    <div className="feature-grid">
      {features.map((feature) => (
        <article className="feature-card" key={feature.title}>
          <h4>{feature.title}</h4>
          <p>{feature.description}</p>
        </article>
      ))}
    </div>
  );
}
