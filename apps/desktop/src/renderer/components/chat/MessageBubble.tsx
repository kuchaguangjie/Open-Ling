import { Copy } from "@phosphor-icons/react";
import { memo, useId, useLayoutEffect, useRef } from "react";
import { useLingua } from "../../localization/useLingua";

interface MessageBubbleProps {
  role: "user" | "assistant";
  name: string;
  content: string;
  status?: string;
  metadata?: Record<string, unknown>;
  activityLabel?: string;
  counselorAvatarSrc?: string;
  userAvatarSrc?: string;
  onRetry?: () => void;
}

interface BubbleAttachment {
  id: string;
  title: string;
  contentLength: number;
  kind?: "text" | "image" | "document";
  status?: string;
}

export const MessageBubble = memo(function MessageBubble({
  role,
  name,
  content,
  status,
  metadata,
  activityLabel,
  counselorAvatarSrc,
  userAvatarSrc,
  onRetry
}: MessageBubbleProps) {
  const { t } = useLingua();
  const isAssistantSending = role === "assistant" && status === "sending";
  const isAssistantWaiting = isAssistantSending && !content;
  const canCopy = role === "assistant" && !isAssistantSending && Boolean(content.trim());
  const attachments = getBubbleAttachments(metadata);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const copyTooltipId = useId();
  const animationFrameRef = useRef<number | null>(null);
  const animationCleanupRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble || role !== "assistant") return;
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    if (animationCleanupRef.current !== null) window.clearTimeout(animationCleanupRef.current);

    if (status === "sending") {
      bubble.style.transition = "none";
      bubble.style.width = "fit-content";
      return;
    }

    const currentRect = bubble.getBoundingClientRect();
    bubble.style.transition = "none";
    bubble.style.width = "fit-content";
    const targetRect = bubble.getBoundingClientRect();
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || currentRect.width === 0) {
      bubble.style.removeProperty("transition");
      return;
    }

    bubble.style.width = `${currentRect.width}px`;
    void bubble.offsetWidth;
    animationFrameRef.current = window.requestAnimationFrame(() => {
      bubble.style.removeProperty("transition");
      bubble.style.width = `${targetRect.width}px`;
      animationFrameRef.current = null;
      if (status !== "sending") {
        animationCleanupRef.current = window.setTimeout(() => {
          bubble.style.removeProperty("width");
          animationCleanupRef.current = null;
        }, 260);
      }
    });

    return () => {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      if (animationCleanupRef.current !== null) window.clearTimeout(animationCleanupRef.current);
    };
  }, [attachments.length, content, isAssistantWaiting, role, status]);

  return (
    <article className={`message-row ${role}`}>
      {role === "assistant" ? (
        counselorAvatarSrc ? (
          <img alt={t("messages.avatar").replace("{name}", name)} className="message-avatar image" src={counselorAvatarSrc} />
        ) : (
          <span className="message-avatar text" aria-hidden="true">
            {name.slice(0, 1)}
          </span>
        )
      ) : userAvatarSrc ? (
        <img alt={t("messages.avatar").replace("{name}", name)} className="message-avatar image" src={userAvatarSrc} />
      ) : (
        <span className="message-avatar text" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
      )}
      <div className="message-content">
        {role === "assistant" || userAvatarSrc || name !== t("room.you") ? <span className="message-name">{name}</span> : null}
        <div className={`message-bubble ${role}${isAssistantWaiting ? " thinking" : ""}${canCopy ? " copyable" : ""}`} ref={bubbleRef}>
          {isAssistantWaiting ? (
            <div className="message-thinking" aria-label={t("messages.responding").replace("{name}", name)}>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </div>
          ) : content.trim() ? (
            <p>{content}</p>
          ) : null}
          {attachments.length > 0 ? (
            <div className="message-attachments" aria-label={t("messages.attachments")}>
              {attachments.map((attachment) => (
                <div className="message-attachment" key={attachment.id}>
                  <span>{attachment.title}</span>
                  <small>
                    {attachment.status === "record-only"
                      ? t("messages.notRead")
                      : attachment.kind === "image"
                        ? t("messages.imageSent")
                      : t("messages.characterCount").replace("{count}", attachment.contentLength.toLocaleString())}
                  </small>
                </div>
              ))}
            </div>
          ) : null}
          {canCopy ? (
            <span className="message-copy-control">
              <button
                aria-describedby={copyTooltipId}
                aria-label={t("messages.copy")}
                className="message-copy-button"
                onClick={() => void navigator.clipboard.writeText(content)}
                type="button"
              >
                <Copy aria-hidden="true" size={14} />
              </button>
              <span className="message-copy-tooltip" id={copyTooltipId} role="tooltip">
                {t("messages.copy")}
              </span>
            </span>
          ) : null}
        </div>
        {isAssistantSending ? (
          <div className="message-thinking-note" aria-live="polite">
            <span aria-hidden="true" />
            <p>{activityLabel ?? t("messages.understanding").replace("{name}", name)}</p>
          </div>
        ) : null}
        {status === "failed" && onRetry ? (
          <div className="message-retry-row">
            <span>{t("messages.sendFailed")}</span>
            <button type="button" onClick={onRetry}>
              {t("messages.retry")}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
});

function getBubbleAttachments(metadata: Record<string, unknown> | undefined): BubbleAttachment[] {
  const value = metadata?.attachments ?? metadata?.importedDocuments;
  if (!Array.isArray(value)) return [];
  return value.filter(isBubbleAttachment).map((item) => ({
    id: item.id,
    title: item.title,
    contentLength: item.contentLength,
    kind: item.kind,
    status: item.status
  }));
}

function isBubbleAttachment(value: unknown): value is BubbleAttachment {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.title === "string" && typeof record.contentLength === "number";
}
