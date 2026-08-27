import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ConsultationPanelSkin } from "./ConsultationPanelSkin";
import "./transitions.css";
import { useLingua } from "../../../localization/useLingua";

export function ConsultationConfirmDialog({
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  title,
  tone = "default"
}: {
  cancelLabel?: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: "default" | "ending";
}) {
  const { t } = useLingua();
  const resolvedCancelLabel = cancelLabel ?? t("confirm.stay");
  const backdropRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const backdrop = backdropRef.current;
    const siblings = backdrop?.parentElement
      ? Array.from(backdrop.parentElement.children).filter(
          (element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop
        )
      : [];
    const previousSiblingState = siblings.map((element) => ({
      ariaHidden: element.getAttribute("aria-hidden"),
      element,
      inert: element.inert
    }));
    siblings.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousSiblingState.forEach(({ ariaHidden, element, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      previousFocusRef.current?.focus();
    };
  }, [onCancel]);

  return createPortal(
    <div className="consultation-confirm-backdrop" onClick={onCancel} ref={backdropRef}>
      <section
        aria-labelledby="consultation-confirm-title"
        aria-modal="true"
        className={`consultation-confirm-panel is-${tone}`}
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <ConsultationPanelSkin />
        <div className="consultation-confirm-content">
          <p className="consultation-confirm-kicker">{t("brand.studio")}</p>
          <h2 id="consultation-confirm-title">{title}</h2>
          <p>{message}</p>
          <div className="consultation-confirm-actions">
            <button className="secondary" onClick={onCancel} ref={cancelRef} type="button">{resolvedCancelLabel}</button>
            <button onClick={onConfirm} type="button">{confirmLabel}</button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
