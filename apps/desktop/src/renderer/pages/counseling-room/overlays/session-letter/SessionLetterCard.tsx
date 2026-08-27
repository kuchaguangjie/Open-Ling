import type { SessionLetter } from "@shared/index";
import closedEnvelopeArt from "../../../../../../../../assets/runtime/session-letter/envelope-closed-transparent.png";
import letterEnvelopeArt from "../../../../../../../../assets/runtime/session-letter/envelope-paper-transparent.png";
import { useLingua } from "../../../../localization/useLingua";

export function SessionLetterCard({ counselorName, letter, onOpen, onRegenerate }: { counselorName: string; letter?: SessionLetter; onOpen: (letter: SessionLetter) => void; onRegenerate: () => void }) {
  const { t } = useLingua();
  const status = letter?.status ?? "pending";
  const envelopeArt = status === "ready" ? letterEnvelopeArt : closedEnvelopeArt;
  return (
    <article className={`session-letter-card ${status}`} aria-label={t("letter.cardAria")}>
      <div className="session-letter-icon" aria-hidden="true"><img alt="" src={envelopeArt} /></div>
      <div className="session-letter-card-body">
        <div className="session-letter-card-heading"><h2>{t("letter.from").replace("{name}", counselorName)}</h2><span>{t(status === "ready" ? "letter.ready" : status === "failed" ? "letter.failed" : "letter.writing")}</span></div>
        <p>{!letter || letter.status === "pending"
          ? t("letter.pendingBody").replace("{name}", counselorName)
          : letter.status === "failed"
            ? letter.errorMessage ?? t("letter.failedBody")
            : t("letter.readyBody")}</p>
        {status === "pending" && <div className="session-letter-card-progress" role="status">{t("letter.progress")}</div>}
        {status !== "pending" && <div className="session-letter-card-actions">
          {status === "ready" && letter && <button type="button" onClick={() => onOpen(letter)}>{t("letter.open")}</button>}
          {status === "failed" && <button className="secondary" type="button" onClick={onRegenerate}>{t("letter.regenerate")}</button>}
        </div>}
      </div>
    </article>
  );
}
