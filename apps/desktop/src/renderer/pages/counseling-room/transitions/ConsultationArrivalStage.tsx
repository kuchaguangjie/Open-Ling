import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./transitions.css";
import { useLingua } from "../../../localization/useLingua";
import type { SupportedLocale } from "@shared/index";

const arrivalCharacterIntervalMs = 88;
const arrivalHoldMs = 3_000;

export function ConsultationArrivalStage({
  backgroundSrc,
  counselorName,
  date,
  onComplete
}: {
  backgroundSrc?: string;
  counselorName: string;
  date?: Date;
  onComplete: () => void;
}) {
  const { locale, t } = useLingua();
  const [arrivalDate] = useState(() => date ?? new Date());
  const copy = useMemo(
    () => formatConsultationArrivalCopy(counselorName, arrivalDate, locale),
    [arrivalDate, counselorName, locale]
  );
  const [reducedMotion] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [displayedLength, setDisplayedLength] = useState(reducedMotion ? copy.length : 0);
  const [isTypingComplete, setIsTypingComplete] = useState(reducedMotion);
  const completedRef = useRef(false);
  const typingTimerRef = useRef<number | undefined>(undefined);
  const autoAdvanceTimerRef = useRef<number | undefined>(undefined);
  const style = backgroundSrc
    ? ({ "--consultation-dialogue-background": `url(${backgroundSrc})` } as CSSProperties)
    : undefined;

  const completeArrival = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = false;
    if (reducedMotion) {
      setDisplayedLength(copy.length);
      setIsTypingComplete(true);
      return;
    }
    setDisplayedLength(0);
    setIsTypingComplete(false);
    typingTimerRef.current = window.setInterval(() => {
      setDisplayedLength((current) => {
        const next = Math.min(current + 1, copy.length);
        if (next >= copy.length && typingTimerRef.current !== undefined) {
          window.clearInterval(typingTimerRef.current);
          typingTimerRef.current = undefined;
          setIsTypingComplete(true);
        }
        return next;
      });
    }, arrivalCharacterIntervalMs);
    return () => {
      if (typingTimerRef.current !== undefined) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = undefined;
      }
    };
  }, [copy, reducedMotion]);

  useEffect(() => {
    if (!isTypingComplete || completedRef.current) return;
    autoAdvanceTimerRef.current = window.setTimeout(completeArrival, arrivalHoldMs);
    return () => {
      if (autoAdvanceTimerRef.current !== undefined) {
        window.clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = undefined;
      }
    };
  }, [completeArrival, isTypingComplete]);

  function advanceArrival() {
    if (completedRef.current) return;
    if (!isTypingComplete) {
      if (typingTimerRef.current !== undefined) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = undefined;
      }
      setDisplayedLength(copy.length);
      setIsTypingComplete(true);
      return;
    }
    if (autoAdvanceTimerRef.current !== undefined) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = undefined;
    }
    completeArrival();
  }

  return (
    <section aria-label={t("arrival.aria")} className="consultation-dialogue-stage consultation-arrival-stage" style={style}>
      <button
        aria-label={t(isTypingComplete ? "arrival.continue" : "arrival.showFull")}
        className="consultation-arrival-interaction"
        onClick={advanceArrival}
        type="button"
      >
        <div aria-hidden="true" className="consultation-arrival-room-shade" />
        <div className="consultation-arrival-band">
          <p aria-live="polite" className="sr-only">{copy}</p>
          <p aria-hidden="true" className="consultation-arrival-copy">
            {copy.slice(0, displayedLength)}
            <span className={displayedLength < copy.length ? "consultation-arrival-caret is-visible" : "consultation-arrival-caret"} />
          </p>
          <span aria-hidden="true" className={isTypingComplete ? "consultation-arrival-next is-visible" : "consultation-arrival-next"}>»</span>
        </div>
      </button>
    </section>
  );
}

export function formatConsultationArrivalCopy(counselorName: string, date: Date, locale: SupportedLocale = "zh-CN") {
  const dateCopy = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
  return locale === "en-US"
    ? `${dateCopy} · Qunxin Psychology Studio · ${counselorName}'s counseling room`
    : `${dateCopy} · 群心心理工作室 · ${counselorName}的咨询室`;
}
