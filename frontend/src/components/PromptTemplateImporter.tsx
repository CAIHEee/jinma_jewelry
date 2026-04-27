import { useEffect, useState } from "react";

import type { PromptTemplate } from "../types/prompts";

interface PromptTemplateImporterProps {
  templates: PromptTemplate[];
  onImport: (value: string) => void;
}

export function PromptTemplateImporter({ templates, onImport }: PromptTemplateImporterProps) {
  const [open, setOpen] = useState(false);

  function closeModal() {
    setOpen(false);
  }

  function importTemplate(content: string) {
    onImport(content);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const htmlElement = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = htmlElement.style.overflow;

    htmlElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      htmlElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="prompt-template-popover">
      <button className="template-trigger-button" type="button" onClick={() => setOpen(true)}>
        提示词模板
      </button>

      {open ? (
        <div
          className="template-modal-backdrop"
          role="presentation"
          onClick={closeModal}
          onPointerUp={closeModal}
        >
          <div
            className="template-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="提示词模板库"
            onClick={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
          >
            <div className="template-modal-header">
              <div className="stack-list compact-stack">
                <h3>提示词模板库</h3>
                <p className="muted">一键导入后仍可继续修改～</p>
              </div>
              <button
                className="template-close-button"
                type="button"
                onClick={closeModal}
                onPointerUp={closeModal}
                onTouchEnd={closeModal}
                aria-label="关闭模板窗口"
              >
                ×
              </button>
            </div>

            <div className="template-modal-body">
              <div className="template-library-grid">
                {templates.map((template) => (
                  <article className="template-library-card" key={template.id}>
                    <div className="template-library-cover" aria-hidden="true">
                      <span>{template.title}</span>
                    </div>

                    <div className="stack-list compact-stack">
                      <strong>{template.title}</strong>
                      <p className="muted">{template.content}</p>
                      {template.note ? <small>{template.note}</small> : null}
                    </div>

                    <button
                      className="primary-button compact-button"
                      type="button"
                      onClick={() => importTemplate(template.content)}
                      onPointerUp={() => importTemplate(template.content)}
                      onTouchEnd={() => importTemplate(template.content)}
                    >
                      一键导入
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
