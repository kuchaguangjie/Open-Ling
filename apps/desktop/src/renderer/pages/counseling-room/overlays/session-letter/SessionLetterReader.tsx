import { isSessionLetterSalutation, splitSessionLetterParagraphs, type SessionLetter } from "@shared/index";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useViewportFitScale } from "../../../../hooks/useViewportFitScale";
import letterEnvelopeArt from "../../../../../../../../assets/runtime/session-letter/envelope-paper-transparent.png";
import letterWaxSealArt from "../../../../../../../../assets/runtime/session-letter/wax-seal-cord-ling-transparent.png";
import "../overlays.css";
import { useLingua } from "../../../../localization/useLingua";

export function SessionLetterReader({ counselorName, clientDisplayName, letter, sessionTitle, onClose }: { counselorName: string; clientDisplayName?: string; letter: SessionLetter; sessionTitle?: string; onClose: () => void }) {
  const { locale, t } = useLingua();
  const closeRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const viewportScale = useViewportFitScale(readerRef, { extraHeight: 94, extraWidth: 44, margin: 18, minimumScale: 0.56 });

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const backdrop = backdropRef.current;
    const siblings = backdrop?.parentElement
      ? Array.from(backdrop.parentElement.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop)
      : [];
    const previousSiblingState = siblings.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden")
    }));
    siblings.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousSiblingState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="session-letter-reader-backdrop" onClick={onClose} ref={backdropRef}>
      <article
        aria-label={t("letter.readerAria").replace("{name}", counselorName)}
        aria-modal="true"
        className="session-letter-reader"
        onClick={(event) => event.stopPropagation()}
        ref={readerRef}
        role="dialog"
        style={{ scale: viewportScale }}
      >
        <img className="session-letter-reader-envelope" alt="" src={letterEnvelopeArt} /><img className="session-letter-reader-seal" alt="" src={letterWaxSealArt} />
        <div className="session-letter-reader-paper">
          <button className="session-letter-reader-close" ref={closeRef} type="button" aria-label={t("letter.close")} onClick={onClose}>×</button>
          <header className="session-letter-reader-letterhead"><h2>{sessionTitle ?? t("letter.title").replace("{name}", counselorName)}</h2><div className="session-letter-reader-divider" aria-hidden="true" /></header>
          <div className="session-letter-reader-body">{renderLetterParagraphs(letter.letterMd, counselorName, clientDisplayName, locale)}</div>
          <footer className="session-letter-reader-signature"><p>{counselorName}</p><time dateTime={letter.updatedAt}>{formatReadableDate(letter.updatedAt, locale)}</time></footer>
        </div>
      </article>
    </div>,
    document.body
  );
}

function renderLetterParagraphs(markdown: string, signatureName: string | undefined, clientDisplayName: string | undefined, locale: "zh-CN" | "en-US") {
  const paragraphs = splitSessionLetterParagraphs(markdown, clientDisplayName, locale);
  if (signatureName && paragraphs.at(-1)?.replace(/\s/g, "") === signatureName.replace(/\s/g, "")) paragraphs.pop();
  return paragraphs.map((paragraph, index) => <p className={isSessionLetterSalutation(paragraph) ? "letter-salutation" : undefined} key={`${paragraph.slice(0, 18)}-${index}`}>{paragraph}</p>);
}

function formatReadableDate(value: string, locale: "zh-CN" | "en-US") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return locale === "en-US"
    ? new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(parsed)
    : `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}
