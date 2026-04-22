import { useEffect, useState } from "react";

interface FloatingToastProps {
  message: string | null;
  type?: "success" | "error";
  durationMs?: number;
}

export function FloatingToast({ message, type = "error", durationMs = 2600 }: FloatingToastProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timeoutId = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [durationMs, message]);

  if (!message || !visible) {
    return null;
  }

  return (
    <div className="admin-toast-layer" aria-live="polite">
      <div className={type === "success" ? "admin-toast success" : "admin-toast error"}>{message}</div>
    </div>
  );
}
