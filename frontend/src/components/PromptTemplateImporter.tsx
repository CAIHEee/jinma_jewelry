import { useEffect, useMemo, useState } from "react";

import type { PromptTemplate } from "../types/prompts";

interface PromptTemplateImporterProps {
  templates: PromptTemplate[];
  onImport: (value: string) => void;
}

export function PromptTemplateImporter({ templates, onImport }: PromptTemplateImporterProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<"english" | "chinese">("chinese");

  const currentTemplates = useMemo(
    () =>
      templates.map((template) => ({
        ...template,
        content: language === "english" ? template.english : template.chinese,
      })),
    [language, templates],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const htmlElement = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = htmlElement.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const previousHtmlTouchAction = htmlElement.style.touchAction;

    htmlElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    htmlElement.style.touchAction = "none";
    document.body.style.touchAction = "none";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      htmlElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      htmlElement.style.touchAction = previousHtmlTouchAction;
      document.body.style.touchAction = previousTouchAction;
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
        <div className="template-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="template-modal-card" role="dialog" aria-modal="true" aria-label="提示词模板库" onClick={(event) => event.stopPropagation()}>
            <div className="template-modal-header">
              <div className="stack-list compact-stack">
                <h3>提示词模板库</h3>
                <p className="muted">支持中英文模板，一键导入后仍可继续修改。</p>
              </div>
              <button className="template-close-button" type="button" onClick={() => setOpen(false)} aria-label="关闭模板窗口">
                ×
              </button>
            </div>

            <div className="template-modal-toolbar">
              <div className="template-language-row">
                <button
                  type="button"
                  className={language === "chinese" ? "filter-chip active" : "filter-chip"}
                  onClick={() => setLanguage("chinese")}
                >
                  中文版
                </button>
                <button
                  type="button"
                  className={language === "english" ? "filter-chip active" : "filter-chip"}
                  onClick={() => setLanguage("english")}
                >
                  英文版
                </button>
              </div>

              <div className="hint-box template-hint-box">
                使用 Flux / Kontext 系列模型时，建议优先导入英文版；当前 Nano Banana 2 默认更适合直接使用中文版。
              </div>
            </div>

            <div className="template-modal-body">
              <div className="template-library-grid">
                {currentTemplates.map((template) => (
                  <article className="template-library-card" key={template.id}>
                    <div className="template-library-cover" aria-hidden="true">
                      <span>{language === "english" ? "EN" : "中文"}</span>
                    </div>

                    <div className="stack-list compact-stack">
                      <strong>{template.title}</strong>
                      <p className="muted">{template.content}</p>
                      {template.note ? <small>{template.note}</small> : null}
                    </div>

                    <button
                      className="primary-button compact-button"
                      type="button"
                      onClick={() => {
                        onImport(template.content);
                        setOpen(false);
                      }}
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
