import { SectionHeader } from "../components/SectionHeader";

const upscaleModes = [
  { title: "通用增强", helper: "适合大多数概念设计图" },
  { title: "珠宝预设", helper: "增强金属反光与宝石折射表现" },
  { title: "细节锐化", helper: "强化纹理、爪镶与边缘细节" },
  { title: "先降噪", helper: "在保留结构的前提下降低噪点" },
];

export function UpscalePage() {
  return (
    <div className="page-stack">
      <section className="panel two-column-panel">
        <div>
          <SectionHeader
            eyebrow="精修"
            title="高分辨率精修工作区"
            description="把源图、放大倍率和增强参数集中到一个区域，便于连续操作。"
          />
          <div className="comparison-stage">
            <div>
              <span>原始图片</span>
              <div className="compare-card before" />
            </div>
            <div>
              <span>预期结果</span>
              <div className="compare-card after" />
            </div>
          </div>
        </div>
        <div className="form-card">
          <label className="input-group">
            <span>放大倍率</span>
            <select defaultValue="4x">
              <option>2x</option>
              <option>4x</option>
              <option>8x</option>
            </select>
          </label>
          <label className="input-group">
            <span>增强模式</span>
            <select defaultValue="珠宝预设">
              {upscaleModes.map((mode) => (
                <option key={mode.title}>{mode.title}</option>
              ))}
            </select>
          </label>
          <label className="input-group">
            <span>增强说明</span>
            <textarea
              rows={4}
              defaultValue="在不产生过度锐化的前提下，保留金属光泽和宝石切面，并增强细节表现。"
            />
          </label>
          <button className="primary-button" type="button">
            开始精修
          </button>
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          eyebrow="模式"
          title="增强预设"
          description="这些卡片对应后续后端可接入的超分与增强策略。"
        />
        <div className="stats-grid">
          {upscaleModes.map((mode) => (
            <article className="stat-card" key={mode.title}>
              <span>{mode.title}</span>
              <small>{mode.helper}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
