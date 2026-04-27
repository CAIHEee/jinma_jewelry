import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

type AgentMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  attachments?: string[];
};

type AgentConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: AgentMessage[];
};

const initialMessage: AgentMessage = {
  id: "welcome",
  role: "assistant",
  text: "您好！我是金马珠宝的设计 AI Agent。您可以向我描述想要调整的图片处理任务，也可以上传草图、产品图或参考图。后续这里会接入专属 Agent 工作流，现在先作为对话入口使用。",
};

export function RemoveBackgroundPage(_: { assetItems?: unknown }) {
  const initialConversation = useMemo<AgentConversation>(
    () => ({
      id: "default",
      title: "新对话",
      updatedAt: new Date().toISOString(),
      messages: [initialMessage],
    }),
    [],
  );
  const [conversations, setConversations] = useState<AgentConversation[]>([initialConversation]);
  const [activeConversationId, setActiveConversationId] = useState(initialConversation.id);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? conversations[0] ?? initialConversation;
  const messages = activeConversation.messages;
  const attachmentNames = useMemo(() => attachments.map((file) => file.name), [attachments]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length) {
      setAttachments((current) => [...current, ...files].slice(0, 6));
    }
    event.target.value = "";
  }

  function handleNewConversation() {
    const nextConversation: AgentConversation = {
      id: `${Date.now()}`,
      title: "新对话",
      updatedAt: new Date().toISOString(),
      messages: [initialMessage],
    };
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setDraft("");
    setAttachments([]);
  }

  function handleSend() {
    const text = draft.trim();
    if (!text && attachments.length === 0) return;

    const userMessage: AgentMessage = {
      id: `${Date.now()}`,
      role: "user",
      text: text || "已上传参考图片。",
      attachments: attachmentNames,
    };
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              title: text ? text.slice(0, 24) : "图片处理对话",
              updatedAt: new Date().toISOString(),
              messages: [...conversation.messages, userMessage],
            }
          : conversation,
      ),
    );
    setDraft("");
    setAttachments([]);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="agent-chat-page">
      <section className="agent-chat-shell">
        <div className="agent-chat-body">
          <div className="agent-chat-thread" aria-live="polite">
            {messages.map((message) => (
              <article className={message.role === "assistant" ? "agent-message assistant" : "agent-message user"} key={message.id}>
                <div className="agent-avatar" aria-hidden="true">
                  {message.role === "assistant" ? "AI" : "我"}
                </div>
                <div className="agent-message-content">
                  <p>{message.text}</p>
                  {message.attachments?.length ? (
                    <div className="agent-attachment-list">
                      {message.attachments.map((name) => (
                        <span key={name}>{name}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="agent-composer-wrap">
            {attachments.length ? (
              <div className="agent-composer-files">
                {attachments.map((file) => (
                  <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>
                ))}
              </div>
            ) : null}
            <div className="agent-composer">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="输入消息，或上传图片..."
                rows={3}
              />
              <div className="agent-composer-toolbar">
                <div className="agent-composer-tools">
                  <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="上传图片" title="上传图片">
                    <span className="agent-tool-image" aria-hidden="true" />
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="agent-send-row">
                  <span>Enter 发送 / Shift+Enter 换行</span>
                  <button className="agent-send-button" type="button" onClick={handleSend} disabled={!draft.trim() && attachments.length === 0}>
                    <span aria-hidden="true">➤</span>
                    发送
                  </button>
                </div>
              </div>
            </div>
            {/* <p className="agent-chat-disclaimer">AI 生成的内容仅供参考，请注意甄别并结合实际工艺规范。</p> */}
          </div>
        </div>
      </section>
      <aside className={historyCollapsed ? "agent-history-column collapsed" : "agent-history-column"}>
        {!historyCollapsed ? (
          <button className="page-history-toggle-button agent-new-chat-button" type="button" onClick={handleNewConversation}>
            新对话
          </button>
        ) : null}

        <div className={historyCollapsed ? "page-history-sidebar agent-history-sidebar collapsed" : "page-history-sidebar agent-history-sidebar"}>
          <div className="page-history-sidebar-header">
            {!historyCollapsed ? (
              <>
                <div className="stack-list compact-stack">
                  <h4>对话历史</h4>
                </div>
                <button
                  className="page-history-toggle-button"
                  type="button"
                  onClick={() => setHistoryCollapsed(true)}
                  aria-label="收起对话历史"
                  title="收起对话历史"
                >
                  <span className="page-history-toggle-icon" aria-hidden="true">
                    {"<"}
                  </span>
                  <span>收起</span>
                </button>
              </>
            ) : (
              <>
                <span className="page-history-sidebar-mini-title">对话</span>
                <button
                  className="page-history-toggle-button collapsed"
                  type="button"
                  onClick={() => setHistoryCollapsed(false)}
                  aria-label="展开对话历史"
                  title="展开对话历史"
                >
                  <span className="page-history-toggle-icon" aria-hidden="true">
                    {">"}
                  </span>
                </button>
              </>
            )}
          </div>
          <div className="page-history-sidebar-body">
            <div className="page-history-sidebar-list">
              {conversations.map((conversation) => (
                <article className={conversation.id === activeConversationId ? "page-history-card agent-history-card active" : "page-history-card agent-history-card"} key={conversation.id}>
                  <button className="page-history-card-button" type="button" onClick={() => setActiveConversationId(conversation.id)}>
                    {!historyCollapsed ? (
                      <>
                      <div className="history-inline-head history-entry-head">
                        <h4>{conversation.title}</h4>
                      </div>
                      <div className="history-meta-row">
                        <span className="history-time-pill">{new Date(conversation.updatedAt).toLocaleString()}</span>
                        <p className="muted">{Math.max(0, conversation.messages.length - 1)} 条消息</p>
                      </div>
                      </>
                    ) : (
                      <span className="agent-history-mini-dot" aria-hidden="true" />
                    )}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
