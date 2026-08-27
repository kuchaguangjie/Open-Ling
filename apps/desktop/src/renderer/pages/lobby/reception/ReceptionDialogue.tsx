import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import type { DialogueOption } from "../lobbyContracts";
import { ReceptionCounselorDialoguePortrait } from "./ReceptionCounselorDialoguePortrait";
import { useLingua } from "../../../localization/useLingua";
import "./reception-dialogue.css";

export function ReceptionDialogue({
  autoAdvanceOnComplete = false,
  counselorId,
  counselorName,
  onAdvance,
  options,
  showChoices,
  text
}: {
  autoAdvanceOnComplete?: boolean;
  counselorId: string;
  counselorName: string;
  onAdvance: () => void;
  options: DialogueOption[];
  showChoices: boolean;
  text: string;
}) {
  const { t } = useLingua();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visibleCharacters, setVisibleCharacters] = useState(prefersReducedMotion ? text.length : 0);
  const isComplete = visibleCharacters >= text.length;

  useEffect(() => {
    setVisibleCharacters(prefersReducedMotion ? text.length : 0);
    if (prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setVisibleCharacters((current) => {
        if (current >= text.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 42);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, text]);

  useEffect(() => {
    if (!showChoices) return;
    const handleChoiceKey = (event: KeyboardEvent) => {
      const optionIndex = Number(event.key) - 1;
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length) return;
      event.preventDefault();
      options[optionIndex].onSelect();
    };
    window.addEventListener("keydown", handleChoiceKey);
    return () => window.removeEventListener("keydown", handleChoiceKey);
  }, [options, showChoices]);

  useEffect(() => {
    if (!autoAdvanceOnComplete || !isComplete || showChoices) return;
    onAdvance();
  }, [autoAdvanceOnComplete, isComplete, onAdvance, showChoices]);

  const handleAdvance = () => {
    if (!isComplete) {
      setVisibleCharacters(text.length);
      return;
    }
    onAdvance();
  };

  useEffect(() => {
    if (showChoices) return;
    const handleDialogueKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!isComplete) {
        setVisibleCharacters(text.length);
        return;
      }
      onAdvance();
    };
    window.addEventListener("keydown", handleDialogueKey);
    return () => window.removeEventListener("keydown", handleDialogueKey);
  }, [isComplete, onAdvance, showChoices, text.length]);

  return (
    <>
      <div aria-label={t("reception.dialogueLabel")} className="lobby-dialogue" onClick={showChoices ? undefined : handleAdvance} role="dialog">
        {!showChoices && <button aria-label={t(isComplete ? "common.continue" : "reception.showFull")} className="lobby-dialogue-advance-surface" type="button" />}
        <div className="lobby-dialogue-portrait-stage">
          <ReceptionCounselorDialoguePortrait
            counselorId={counselorId}
            counselorName={counselorName}
            isSpeaking={!isComplete}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
        <div className="lobby-dialogue-panel">
          <span aria-hidden="true" className="lobby-dialogue-panel-skin">
            <span className="lobby-dialogue-panel-slice is-top-left" />
            <span className="lobby-dialogue-panel-slice is-top" />
            <span className="lobby-dialogue-panel-slice is-top-right" />
            <span className="lobby-dialogue-panel-slice is-left" />
            <span className="lobby-dialogue-panel-slice is-center" />
            <span className="lobby-dialogue-panel-slice is-right" />
            <span className="lobby-dialogue-panel-slice is-bottom-left" />
            <span className="lobby-dialogue-panel-slice is-bottom" />
            <span className="lobby-dialogue-panel-slice is-bottom-right" />
          </span>
          <span aria-hidden="true" className="lobby-dialogue-panel-paper">
            <span className="lobby-dialogue-paper-corner is-top-left" />
            <span className="lobby-dialogue-paper-corner is-top-right" />
            <span className="lobby-dialogue-paper-corner is-bottom-left" />
            <span className="lobby-dialogue-paper-corner is-bottom-right" />
          </span>
          <p className="lobby-dialogue-name">
            <strong>{counselorName}</strong>
            <span className="lobby-dialogue-role">{t("reception.role")}</span>
            <span aria-hidden="true" className="lobby-dialogue-name-logo" />
          </p>
          <p aria-live="polite" className="sr-only">{text}</p>
          <p aria-hidden="true" className="lobby-dialogue-text">{text.slice(0, visibleCharacters)}</p>
          <span aria-hidden="true" className={`lobby-dialogue-next-arrow${isComplete ? " is-visible" : ""}`} />
        </div>
      </div>
      {showChoices && (
        <div className="lobby-dialogue-choice-backdrop">
          <div aria-label={t("reception.options")} className="lobby-dialogue-options" role="group">
            {options.map((option, index) => (
              <button autoFocus={index === 0} key={option.label} onClick={option.onSelect} type="button">
                <span aria-hidden="true" className="lobby-dialogue-option-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="lobby-dialogue-option-label">{option.label}</span>
                <span aria-hidden="true" className="lobby-dialogue-option-arrow">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
