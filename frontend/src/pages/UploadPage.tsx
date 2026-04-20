import { useEffect, useMemo, useState } from "react";

import { SectionHeader } from "../components/SectionHeader";

const qualityChecks = [
  "校验文件类型与尺寸",
  "提示草图清晰度风险",
  "给出推荐的下一步处理动作",
];

export function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  return (
    <div className="page-stack">
      <section className="panel two-column-panel">
        <div>
          <SectionHeader
            eyebrow="上传"
            title="草图与参考图上传"
            description="让从草图和参考图开始的用户，一进来就知道下一步该怎么做。"
          />
          <label className="upload-dropzone">
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
            <strong>将图片拖到这里，或点击选择文件</strong>
            <span>支持 PNG、JPG 和 WEBP，后续可继续补 HEIC 与 PSD 转换。</span>
          </label>
        </div>
        <div className="panel-subcard">
          <h4>即时检查</h4>
          <div className="stack-list">
            {qualityChecks.map((item) => (
              <div className="line-item" key={item}>
                <span className="dot" />
                <p>{item}</p>
              </div>
            ))}
          </div>
          <div className="hint-box">
            这个区域后续可以接图像质量分析、边缘检测和文件头校验。
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          eyebrow="预览"
          title="已选参考图"
          description="本地预览能帮你在接入存储前，先确认选中的素材是否正确。"
        />
        {previews.length > 0 ? (
          <div className="local-preview-grid">
            {previews.map((preview) => (
              <article className="local-preview-card" key={preview.name}>
                <img src={preview.url} alt={preview.name} />
                <p>{preview.name}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel-subcard">
            <p className="muted">暂未选择本地参考图。</p>
          </div>
        )}
      </section>

      <section className="panel">
        <SectionHeader
          eyebrow="流转"
          title="下一步建议"
          description="上传完成后，界面应明确告诉用户下一步该去哪里。"
        />
        <div className="stats-grid three-up">
          <article className="action-card">
            <h4>生成多视图</h4>
            <p>把草图扩展成正视、侧视和俯视等结构视图。</p>
          </article>
          <article className="action-card">
            <h4>多图融合</h4>
            <p>把上传图片与历史资产融合，形成新的设计方向。</p>
          </article>
          <article className="action-card">
            <h4>保存到历史</h4>
            <p>为后续编辑、精修和建模流程保留源素材。</p>
          </article>
        </div>
      </section>
    </div>
  );
}
