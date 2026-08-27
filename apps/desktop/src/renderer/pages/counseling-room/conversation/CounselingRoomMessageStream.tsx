import { useEffect, useRef, useState, type RefObject } from "react";
import type { ConsultationPreparation, SessionLetter } from "@shared/index";
import type { PrototypeSession } from "../../../stores/sessionStore";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { ConsultationPreparationCard } from "../overlays/consultation-preparation/ConsultationPreparationCard";
import { SessionLetterCard } from "../overlays/session-letter/SessionLetterCard";
import { useLingua } from "../../../localization/useLingua";

export interface CounselingRoomMessageStreamProps {
  activePreparation?: ConsultationPreparation;
  activeSession?: PrototypeSession;
  activeSessionLetter?: SessionLetter;
  counselorAvatarSrc: string;
  counselorName: string;
  isSessionEnded: boolean;
  streamRef: RefObject<HTMLDivElement | null>;
  userAvatarSrc?: string;
  userDisplayName: string;
  waitingActivityText: string;
  mode?: "session" | "history-closing" | "history-archive" | "ending";
  onCreateSession?: () => void;
  onOpenLetter: (letter: SessionLetter) => void;
  onRegenerateLetter: () => void;
  onRetryMessage: (messageId: string) => void;
  onRetryPreparation: () => void;
}

export function CounselingRoomMessageStream(props: CounselingRoomMessageStreamProps) {
  const { t } = useLingua();
  const mode = props.mode ?? "session";
  const [isScrollIndicatorVisible, setIsScrollIndicatorVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollIndicatorTimeoutRef = useRef<number | undefined>(undefined);
  const showPostSessionArtifacts = mode === "history-archive";
  const preparationStatus = props.activePreparation?.status;
  const showPreparation = mode === "history-archive" && (preparationStatus === "pending" || preparationStatus === "processing" || preparationStatus === "failed");
  const showLetter = !preparationStatus || preparationStatus === "ready";

  useEffect(() => {
    return () => window.clearTimeout(scrollIndicatorTimeoutRef.current);
  }, []);
  return (
    <div className="message-stream-shell">
      <div
        className="message-stream"
        aria-label={t("messages.stream")}
        ref={props.streamRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          const range = element.scrollHeight - element.clientHeight;
          setScrollProgress(range > 0 ? element.scrollTop / range : 0);
          setIsScrollIndicatorVisible(true);
          window.clearTimeout(scrollIndicatorTimeoutRef.current);
          scrollIndicatorTimeoutRef.current = window.setTimeout(() => setIsScrollIndicatorVisible(false), 900);
        }}
      >
      {props.activeSession ? (
        <>
          {props.activeSession.messages.map((message) => (
            <MessageBubble
              content={message.content}
              key={message.id}
              metadata={message.metadata}
              name={message.role === "assistant" ? props.counselorName : props.userDisplayName}
              role={message.role === "assistant" ? "assistant" : "user"}
              status={message.status}
              counselorAvatarSrc={message.role === "assistant" ? props.counselorAvatarSrc : undefined}
              userAvatarSrc={message.role === "user" ? props.userAvatarSrc : undefined}
              onRetry={message.status === "failed" ? () => props.onRetryMessage(message.id) : undefined}
              activityLabel={message.role === "assistant" && message.status === "sending" ? props.waitingActivityText : undefined}
            />
          ))}
          {props.isSessionEnded && showPostSessionArtifacts && showPreparation && <ConsultationPreparationCard preparation={props.activePreparation} onRetry={props.onRetryPreparation} />}
          {props.isSessionEnded && showPostSessionArtifacts && showLetter && <SessionLetterCard counselorName={props.counselorName} letter={props.activeSessionLetter} onOpen={props.onOpenLetter} onRegenerate={props.onRegenerateLetter} />}
        </>
      ) : (
        <div className="conversation-empty-state">
          <h2>{t("room.noSession")}</h2>
          {props.onCreateSession && <button className="secondary-action" type="button" onClick={props.onCreateSession}>{t("messages.startNew")}</button>}
        </div>
      )}
      </div>
      <div className={`message-scroll-indicator${isScrollIndicatorVisible ? " is-visible" : ""}`} aria-hidden="true">
        <span style={{ transform: `translateY(${scrollProgress * 257}%)` }} />
      </div>
    </div>
  );
}
