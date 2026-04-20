import type { AppView } from "../App";
import { HistoryGallery } from "../components/HistoryGallery";
import { SectionHeader } from "../components/SectionHeader";
import { StageTimeline } from "../components/StageTimeline";
import type { HistoryItem, TaskSummary, WorkflowStage, WorkflowStat } from "../types/mockData";
import type { WorkspaceRun } from "../types/workspace";
import { formatHistoryTimestamp } from "../utils/history";

interface DashboardPageProps {
  onNavigate: (view: AppView) => void;
  workflowStats: WorkflowStat[];
  stages: WorkflowStage[];
  historyItems: HistoryItem[];
  tasks: TaskSummary[];
  workspaceRuns: WorkspaceRun[];
}

export function DashboardPage({
  onNavigate,
  workflowStats,
  stages,
  historyItems,
  tasks,
  workspaceRuns,
}: DashboardPageProps) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy-block">
          <p className="eyebrow">总览</p>
          <h2>从草图上传到融合、精修与资产沉淀的一体化工作台</h2>
          <p>
            这个总览页会把珠宝 AI 的核心流程直接展开，方便后续继续接真实模型、任务队列与存储能力。
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => onNavigate("fusion")}>
              进入多图融合
            </button>
            <button className="secondary-button" type="button" onClick={() => onNavigate("text-to-image")}>
              进入文案生图
            </button>
            <button className="secondary-button" type="button" onClick={() => onNavigate("image-edit")}>
              进入绘稿/写实
            </button>
          </div>
        </div>
        <div className="hero-summary-card">
          <strong>当前重点</strong>
          <ul className="plain-list">
            <li>完善前端工作流页面</li>
            <li>继续接入真实 AI 服务能力</li>
            <li>补齐轮询、队列状态与资产持久化</li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          eyebrow="快照"
          title="流程概览"
          description="快速查看任务量、版本沉淀和当前实现状态。"
        />
        <div className="stats-grid">
          {workflowStats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.helper}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          eyebrow="流程"
          title="核心阶段"
          description="MVP 路径已经拆成清晰阶段卡片，便于整站围绕它继续扩展。"
        />
        <StageTimeline stages={stages} />
      </section>

      <section className="panel two-column-panel">
        <div>
          <SectionHeader
            eyebrow="最近产物"
            title="最近资产"
            description="可以直接从最近版本继续迭代，减少来回查找。"
          />
          <HistoryGallery items={historyItems.slice(0, 4)} compact />
        </div>
        <div>
          <SectionHeader
            eyebrow="队列"
            title="任务看板"
            description="当前先展示静态任务卡片，后续可以替换为实时队列数据。"
          />
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div>
                  <h4>{task.title}</h4>
                  <p>{task.helper}</p>
                </div>
                <span className={`status-pill ${task.statusClass}`}>{task.statusLabel}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel two-column-panel">
        <div>
          <SectionHeader
            eyebrow="会话"
            title="当前会话产出"
            description="本次浏览器会话里生成的结果会即时显示在这里。"
          />
          {workspaceRuns.length > 0 ? (
            <div className="session-run-list">
              {workspaceRuns.slice(0, 4).map((run) => (
                <article className="session-run-card" key={run.id}>
                  <div>
                    <h4>{run.title}</h4>
                    <p>{run.model}</p>
                    <small>{formatHistoryTimestamp(run.createdAt)}</small>
                  </div>
                  <span className="status-pill online">{run.status}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel-subcard">
              <p className="muted">当前会话还没有产出，执行文案生图或多图融合后会显示在这里。</p>
            </div>
          )}
        </div>
        <div>
          <SectionHeader
            eyebrow="引导"
            title="推荐使用路径"
            description="适合首次使用这个界面的操作顺序。"
          />
          <div className="guide-list">
            <article className="guide-step">
              <span>1</span>
              <div>
                <h4>先从上传或文案生图开始</h4>
                <p>先得到一张可用的基础图，再进入融合或编辑流程。</p>
              </div>
            </article>
            <article className="guide-step">
              <span>2</span>
              <div>
                <h4>在融合页混合参考图</h4>
                <p>当多张参考图都重要时，优先选择 Nano Banana 或 Kontext 模型。</p>
              </div>
            </article>
            <article className="guide-step">
              <span>3</span>
              <div>
                <h4>继续精修或生成多视图</h4>
                <p>把较强的草稿推进到图像编辑或结构化多视图输出。</p>
              </div>
            </article>
            <article className="guide-step">
              <span>4</span>
              <div>
                <h4>沉淀通过的版本</h4>
                <p>将确认结果送去产品精修，并沉淀到历史工作区中。</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
