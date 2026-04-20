import type { HistoryItem } from "../types/mockData";

interface HistoryGalleryProps {
  items: HistoryItem[];
  compact?: boolean;
  onPreview?: (item: HistoryItem) => void;
}

export function HistoryGallery({ items, compact = false, onPreview }: HistoryGalleryProps) {
  return (
    <div className={compact ? "history-grid compact" : "history-grid"}>
      {items.map((item) => (
        <article className="history-card" key={item.id}>
          <div className="history-preview" style={{ background: item.preview }} />
          <div className="history-card-body">
            <div className="history-topline">
              <h4>{item.title}</h4>
              <span className="history-version">{item.version}</span>
            </div>
            <p>{item.module}</p>
            <small>{item.updatedAt}</small>
            {onPreview ? (
              <button className="secondary-button" type="button" onClick={() => onPreview(item)}>
                查看预览
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
