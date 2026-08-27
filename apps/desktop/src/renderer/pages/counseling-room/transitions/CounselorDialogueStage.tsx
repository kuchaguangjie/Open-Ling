import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { CounselorFaceFrames, CounselorFaceOverlays } from "../../../flows/consultation/counselorFlowAssets";
import { CounselorDialoguePortrait } from "./CounselorDialoguePortrait";
import { ConsultationPanelSkin } from "./ConsultationPanelSkin";
import "./transitions.css";
import { useLingua } from "../../../localization/useLingua";

export interface DialogueStageAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export function CounselorDialogueStage({
  backgroundSrc,
  busy = false,
  children,
  counselorName,
  errorMessage,
  frames,
  overlays,
  onTextComplete,
  phase,
  primaryAction,
  secondaryAction,
  text,
  topLeftAction,
  topRightAction
}: {
  backgroundSrc?: string;
  busy?: boolean;
  children?: React.ReactNode;
  counselorName: string;
  errorMessage?: string;
  frames?: CounselorFaceFrames;
  overlays?: CounselorFaceOverlays;
  onTextComplete?: () => void;
  phase: "opening" | "closing";
  primaryAction?: DialogueStageAction;
  secondaryAction?: DialogueStageAction;
  text: string;
  topLeftAction?: DialogueStageAction;
  topRightAction?: DialogueStageAction;
}) {
  const { t } = useLingua();
  const [displayedLength, setDisplayedLength] = useState(0);
  const [reducedMotion] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [phase, text]);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedLength(text.length);
      return;
    }
    setDisplayedLength(0);
    const interval = window.setInterval(() => {
      setDisplayedLength((current) => {
        if (current >= text.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 32);
    return () => window.clearInterval(interval);
  }, [reducedMotion, text]);

  useEffect(() => {
    if (!onTextComplete || displayedLength < text.length) return;
    const timeout = window.setTimeout(onTextComplete, 500);
    return () => window.clearTimeout(timeout);
  }, [displayedLength, onTextComplete, text.length]);

  const speaking = displayedLength < text.length;
  const usesAdvanceArrow = Boolean(
    primaryAction &&
    !secondaryAction &&
    (primaryAction.label === t("common.continue") || primaryAction.label === t("dialogue.next"))
  );
  const style = backgroundSrc ? ({ "--consultation-dialogue-background": `url(${backgroundSrc})` } as CSSProperties) : undefined;

  const handleDialogueAdvance = () => {
    if (!primaryAction || busy || primaryAction.disabled) return;
    if (displayedLength < text.length) {
      setDisplayedLength(text.length);
      return;
    }
    primaryAction.onSelect();
  };

  useEffect(() => {
    if (!usesAdvanceArrow) return;
    const handleDialogueKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!primaryAction || busy || primaryAction.disabled) return;
      if (displayedLength < text.length) {
        setDisplayedLength(text.length);
        return;
      }
      primaryAction.onSelect();
    };
    window.addEventListener("keydown", handleDialogueKey);
    return () => window.removeEventListener("keydown", handleDialogueKey);
  }, [busy, displayedLength >= text.length, primaryAction, text.length, usesAdvanceArrow]);

  return (
    <section
      aria-label={t(phase === "opening" ? "dialogue.opening" : "dialogue.closing")}
      className={`consultation-dialogue-stage consultation-dialogue-${phase}`}
      style={style}
    >
      <div className="consultation-dialogue-scrim" />
      {topLeftAction && (
        <button className="consultation-stage-top-action is-left" disabled={busy || topLeftAction.disabled} onClick={topLeftAction.onSelect} type="button">
          {topLeftAction.label}
        </button>
      )}
      {topRightAction && (
        <button className="consultation-stage-top-action is-right" disabled={busy || topRightAction.disabled} onClick={topRightAction.onSelect} type="button">
          {topRightAction.label}
        </button>
      )}
      <CounselorDialoguePortrait counselorName={counselorName} frames={frames} overlays={overlays} speaking={speaking} />
      <div className="consultation-dialogue-card">
        <ConsultationPanelSkin />
        {usesAdvanceArrow && (
          <button
            aria-label={displayedLength < text.length ? t("reception.showFull") : primaryAction?.label}
            className="consultation-dialogue-advance-surface"
            disabled={busy || primaryAction?.disabled}
            onClick={handleDialogueAdvance}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`consultation-dialogue-next-arrow${displayedLength >= text.length ? " is-visible" : ""}`}
            />
          </button>
        )}
        <div className="consultation-dialogue-nameplate">
          <h1 ref={titleRef} tabIndex={-1}>{counselorName}</h1>
          <span className="consultation-dialogue-kicker">{t("dialogue.counselor")}</span>
          <span aria-hidden="true" className="consultation-dialogue-name-logo" />
        </div>
        <p aria-live="polite" className="sr-only">{text}</p>
        <p aria-hidden="true" className="consultation-dialogue-text">{text.slice(0, displayedLength)}</p>
        {errorMessage && <p className="consultation-dialogue-error" role="alert">{errorMessage}</p>}
        {children}
        {!usesAdvanceArrow && (primaryAction || secondaryAction) && (
          <div className="consultation-dialogue-actions">
            {secondaryAction && <button className="secondary" disabled={busy || secondaryAction.disabled} onClick={secondaryAction.onSelect} type="button">{secondaryAction.label}</button>}
            {primaryAction && <button disabled={busy || primaryAction.disabled} onClick={primaryAction.onSelect} type="button">{busy ? t("dialogue.wait") : primaryAction.label}</button>}
          </div>
        )}
      </div>
    </section>
  );
}
