import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

type AutoResizeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function AutoResizeTextarea(props: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const minRows = typeof props.rows === "number" && props.rows > 0 ? props.rows : 3;

    const resize = () => {
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 24;
      const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
      const borderTop = Number.parseFloat(computedStyle.borderTopWidth) || 0;
      const borderBottom = Number.parseFloat(computedStyle.borderBottomWidth) || 0;
      const minHeight = (lineHeight * minRows) + paddingTop + paddingBottom + borderTop + borderBottom;

      textarea.style.height = "auto";
      const nextHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${nextHeight}px`;
    };

    const animationFrame = window.requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    textarea.addEventListener("focus", resize);

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(textarea);

    const parentPanel = textarea.closest(".view-panel");
    const mutationObserver = parentPanel
      ? new MutationObserver(() => {
          window.requestAnimationFrame(resize);
        })
      : null;

    if (parentPanel && mutationObserver) {
      mutationObserver.observe(parentPanel, { attributes: true, attributeFilter: ["class"] });
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      textarea.removeEventListener("focus", resize);
      resizeObserver.disconnect();
      mutationObserver?.disconnect();
    };
  }, [props.rows, props.value]);

  return <textarea {...props} ref={textareaRef} />;
}
