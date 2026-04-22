import { useEffect, useMemo, useRef, useState } from "react";

export interface GenerationProgressPhase {
  at: number;
  label: string;
}

export type GenerationProgressState = "idle" | "running" | "success" | "error";

interface GenerationProgressProps {
  state: GenerationProgressState;
  phases?: GenerationProgressPhase[];
  successLabel?: string;
  errorLabel?: string;
}

const defaultPhases: GenerationProgressPhase[] = [
  { at: 18, label: "准备参数..." },
  { at: 38, label: "提交生成请求..." },
  { at: 72, label: "模型生成中..." },
  { at: 90, label: "整理图片结果..." },
  { at: 95, label: "等待返回结果..." },
];

export function GenerationProgress({
  state,
  phases = defaultPhases,
  successLabel = "已完成",
  errorLabel = "生成失败",
}: GenerationProgressProps) {
  const [progress, setProgress] = useState(8);
  const [visibleState, setVisibleState] = useState<GenerationProgressState>("idle");
  const hideTimerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (state === "running") {
      setVisibleState("running");
      setProgress(8);
      intervalRef.current = window.setInterval(() => {
        setProgress((current) => {
          if (current < 35) return Math.min(current + 5.5, 35);
          if (current < 70) return Math.min(current + 3.2, 70);
          if (current < 88) return Math.min(current + 1.4, 88);
          return Math.min(current + 0.45, 94);
        });
      }, 420);
      return;
    }

    if (state === "success") {
      setVisibleState("success");
      setProgress(100);
      hideTimerRef.current = window.setTimeout(() => {
        setVisibleState("idle");
        setProgress(8);
      }, 1200);
      return;
    }

    if (state === "error") {
      setVisibleState("error");
      setProgress((current) => Math.max(current, 100));
      hideTimerRef.current = window.setTimeout(() => {
        setVisibleState("idle");
        setProgress(8);
      }, 1600);
      return;
    }

    setVisibleState("idle");
    setProgress(8);

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [state]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const phaseLabel = useMemo(() => {
    if (visibleState === "success") return successLabel;
    if (visibleState === "error") return errorLabel;
    return phases.find((phase) => progress <= phase.at)?.label ?? phases[phases.length - 1]?.label ?? "处理中...";
  }, [errorLabel, phases, progress, successLabel, visibleState]);

  if (visibleState === "idle") return null;

  return (
    <div className={`generation-progress ${visibleState !== "running" ? `generation-progress-${visibleState}` : ""}`} role="status" aria-live="polite">
      <div className="generation-progress-head">
        <span>{phaseLabel}</span>
        <strong>{Math.round(progress)}%</strong>
      </div>
      <div className="generation-progress-track" aria-hidden="true">
        <div className="generation-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
