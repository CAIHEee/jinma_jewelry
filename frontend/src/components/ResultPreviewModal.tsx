import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";

interface ResultPreviewModalProps {
  title: string;
  sourceUrl?: string | null;
  sourceLabel?: string;
  resultUrl?: string | null;
  resultLabel?: string;
  onClose: () => void;
}

interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

interface ZoomableLightboxPaneProps {
  imageUrl: string;
  label: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const ZOOM_STEP = 0.24;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ZoomableLightboxPane({ imageUrl, label }: ZoomableLightboxPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });

  function resetZoom() {
    setZoom({ scale: 1, x: 0, y: 0 });
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const nextScale = clamp(zoom.scale + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), MIN_SCALE, MAX_SCALE);
    if (nextScale === zoom.scale) {
      return;
    }

    const pointerX = event.clientX - rect.left - rect.width / 2;
    const pointerY = event.clientY - rect.top - rect.height / 2;
    const contentX = (pointerX - zoom.x) / zoom.scale;
    const contentY = (pointerY - zoom.y) / zoom.scale;

    setZoom({
      scale: nextScale,
      x: pointerX - contentX * nextScale,
      y: pointerY - contentY * nextScale,
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (zoom.scale <= 1) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: zoom.x,
      originY: zoom.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setZoom((current) => ({
      ...current,
      x: dragState.originX + (event.clientX - dragState.startX),
      y: dragState.originY + (event.clientY - dragState.startY),
    }));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className="lightbox-pane">
      <div className="lightbox-pane-head">
        <span>{label}</span>
        {zoom.scale > 1 ? (
          <button className="lightbox-pane-reset" type="button" onClick={resetZoom}>
            Reset
          </button>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className={zoom.scale > 1 ? "lightbox-zoom-surface zoomed" : "lightbox-zoom-surface"}
        onWheel={handleWheel}
        onDoubleClick={resetZoom}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          className="lightbox-zoom-image"
          src={imageUrl}
          alt={label}
          draggable={false}
          style={{ transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})` }}
        />
      </div>
    </section>
  );
}

export function ResultPreviewModal({
  title,
  sourceUrl,
  sourceLabel = "Original",
  resultUrl,
  resultLabel = "Result",
  onClose,
}: ResultPreviewModalProps) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="lightbox-backdrop" role="presentation" onClick={onClose}>
      <div className="lightbox-shell" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="lightbox-header">
          <div className="lightbox-copy">
            <h4>{title}</h4>
            <p className="muted">Use the mouse wheel to zoom, drag to inspect details, and double-click to reset.</p>
          </div>

          <button className="lightbox-close" type="button" onClick={onClose} aria-label="Close preview">
            &times;
          </button>
        </header>

        <div className={sourceUrl ? "lightbox-grid" : "lightbox-grid single"}>
          {sourceUrl ? <ZoomableLightboxPane imageUrl={sourceUrl} label={sourceLabel} /> : null}
          {resultUrl ? (
            <ZoomableLightboxPane imageUrl={resultUrl} label={resultLabel} />
          ) : (
            <section className="lightbox-pane">
              <div className="lightbox-pane-head">
                <span>{resultLabel}</span>
              </div>
              <div className="lightbox-empty">
                <p className="muted">Preview unavailable.</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
