import type { WorkflowStage } from "../types/mockData";

interface StageTimelineProps {
  stages: WorkflowStage[];
}

export function StageTimeline({ stages }: StageTimelineProps) {
  return (
    <div className="timeline-grid">
      {stages.map((stage, index) => (
        <article className="timeline-card" key={stage.title}>
          <div className="timeline-index">0{index + 1}</div>
          <h4>{stage.title}</h4>
          <p>{stage.description}</p>
          <div className="tag-row">
            {stage.tags.map((tag) => (
              <span className="soft-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
