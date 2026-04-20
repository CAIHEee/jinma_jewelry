import { SectionHeader } from "../components/SectionHeader";

const exportFormats = ["STL", "OBJ", "PLY"];

export function StlExportPage() {
  return (
    <div className="page-stack">
      <section className="panel two-column-panel">
        <div>
          <SectionHeader
            eyebrow="三维导出"
            title="STL 与网格导出"
            description="配置从深度信息到可打印或可预览几何体的最终转换参数。"
          />
          <div className="form-card">
            <label className="input-group">
              <span>深度来源</span>
              <select defaultValue="latest-depth">
                <option value="latest-depth">最新深度图</option>
                <option value="history-depth">历史深度图</option>
              </select>
            </label>
            <div className="inline-grid">
              <label className="input-group">
                <span>网格密度</span>
                <select defaultValue="medium">
                  <option>低</option>
                  <option>中</option>
                  <option>高</option>
                </select>
              </label>
              <label className="input-group">
                <span>导出格式</span>
                <select defaultValue="STL">
                  {exportFormats.map((format) => (
                    <option key={format}>{format}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="input-group">
              <span>质量检查</span>
              <select defaultValue="printable">
                <option value="printable">可打印网格检查</option>
                <option value="closed">闭合曲面检查</option>
                <option value="preview">仅预览</option>
              </select>
            </label>
            <button className="primary-button" type="button">
              准备导出
            </button>
          </div>
        </div>

        <div className="panel-subcard">
          <h4>网格预览</h4>
          <div className="mesh-preview-card">
            <div className="mesh-orb" />
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          eyebrow="输出"
          title="导出选项"
          description="最终阶段应同时支持打印制造与预览检查所需的网格格式。"
        />
        <div className="capability-grid">
          {exportFormats.map((format) => (
            <article className="capability-card" key={format}>
              <h4>{format}</h4>
              <p>{format === "STL" ? "制造流程中的主要可打印输出格式。" : "适合预览、检查或后续继续编辑。"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
