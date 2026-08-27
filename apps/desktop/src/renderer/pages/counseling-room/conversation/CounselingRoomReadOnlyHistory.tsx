import { type CSSProperties, useEffect, useRef } from "react";
import type { ConsultationPreparation, SessionLetter } from "@shared/index";
import type { PrototypeSession } from "../../../stores/sessionStore";
import { CounselingRoomMessageStream } from "./CounselingRoomMessageStream";
import "./read-only-history.css";
import { useLingua } from "../../../localization/useLingua";

export function CounselingRoomReadOnlyHistory({
  activePreparation,
  counselorAvatarSrc,
  counselorName,
  onBack,
  onOpenLetter,
  onRegenerateLetter,
  onRecheck,
  onRetryMessages,
  onResume,
  onRetryPreparation,
  resumeBlockedReason,
  roomBackground,
  session,
  sessionLetter,
  userAvatarSrc,
  userDisplayName,
  origin,
  busy = false,
  errorMessage
}: {
  activePreparation?: ConsultationPreparation;
  busy?: boolean;
  counselorAvatarSrc: string;
  counselorName: string;
  errorMessage?: string;
  onBack: () => void;
  onOpenLetter: (letter: SessionLetter) => void;
  onRegenerateLetter: () => void;
  onRecheck?: () => void;
  onRetryMessages: () => void;
  onResume?: () => void;
  onRetryPreparation: () => void;
  origin: "closing" | "archive" | "ending";
  resumeBlockedReason?: string;
  roomBackground?: string;
  session?: PrototypeSession;
  sessionLetter?: SessionLetter;
  userAvatarSrc?: string;
  userDisplayName: string;
}) {
  const { t } = useLingua();
  const streamRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const style = roomBackground ? ({ "--consultation-history-background": `url(${roomBackground})` } as CSSProperties) : undefined;
  const mode = origin === "closing" ? "history-closing" : origin === "ending" ? "ending" : "history-archive";

  useEffect(() => {
    titleRef.current?.focus();
  }, [origin, session?.id]);

  return (
    <section aria-label={t(origin === "ending" ? "history.endingAria" : "features.records.title")} className="consultation-history-layout" style={style}>
      <div className="consultation-history-panel">
        <header className="consultation-history-header">
          <div>
            <p>{t("history.with").replace("{name}", counselorName)}</p>
            <h1 ref={titleRef} tabIndex={-1}>{session?.title ?? t("features.records.title")}</h1>
          </div>
          <div className="consultation-history-actions">
            {origin !== "ending" && <button onClick={onBack} type="button">{t(origin === "closing" ? "common.back" : "room.backLobby")}</button>}
            {origin === "ending" && onRecheck && <button disabled={busy} onClick={onRecheck} type="button">{t("history.recheck")}</button>}
            {origin === "ending" && errorMessage && <button disabled={busy} onClick={onBack} type="button">{t("room.backLobby")}</button>}
            {origin !== "ending" && onResume && (
              <button
                disabled={busy || Boolean(resumeBlockedReason)}
                onClick={onResume}
                title={resumeBlockedReason}
                type="button"
              >
                {t("history.resume")}
              </button>
            )}
          </div>
        </header>
        {resumeBlockedReason && <p className="consultation-history-error" role="status">{resumeBlockedReason}</p>}
        {origin === "ending" && <p className="consultation-ending-status" role="status">{t("history.endingStatus")}</p>}
        {errorMessage && <p className="consultation-history-error" role="alert">{errorMessage}</p>}
        {session?.messagesLoaded === false ? (
          <div className="conversation-load-state" role="status">
            <p>{t("history.loading")}</p>
            <button disabled={busy} onClick={onRetryMessages} type="button">{t("history.reload")}</button>
          </div>
        ) : (
          <CounselingRoomMessageStream
            activePreparation={activePreparation}
            activeSession={session}
            activeSessionLetter={sessionLetter}
            counselorAvatarSrc={counselorAvatarSrc}
            counselorName={counselorName}
            isSessionEnded={session?.status === "ended"}
            mode={mode}
            onOpenLetter={onOpenLetter}
            onRegenerateLetter={onRegenerateLetter}
            onRetryMessage={() => undefined}
            onRetryPreparation={onRetryPreparation}
            streamRef={streamRef}
            userAvatarSrc={userAvatarSrc}
            userDisplayName={userDisplayName}
            waitingActivityText=""
          />
        )}
      </div>
    </section>
  );
}
