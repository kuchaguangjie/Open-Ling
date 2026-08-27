import "./consultation-entry-choice.css";
import { useLingua } from "../../../../localization/useLingua";

export function ConsultationEntryChoice({
  counselorName,
  errorMessage,
  isBusy,
  kind,
  onCancel,
  onPrimary,
  onSecondary
}: {
  counselorName: string;
  errorMessage?: string | null;
  isBusy: boolean;
  kind: "active" | "draft";
  onCancel: () => void;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const { t } = useLingua();
  return (
    <section aria-labelledby="consultation-entry-choice-title" className="consultation-entry-choice">
      <p>{t("booking.with").replace("{name}", counselorName)}</p>
      <h2 id="consultation-entry-choice-title">
        {t(kind === "active" ? "booking.activeTitle" : "booking.draftTitle")}
      </h2>
      <p>
        {t(kind === "active" ? "booking.activeBody" : "booking.draftBody")}
      </p>
      {errorMessage && <p className="consultation-entry-choice-error" role="alert">{errorMessage}</p>}
      <div className="consultation-entry-choice-actions">
        {kind === "active" ? (
          <>
            <button className="secondary" disabled={isBusy} onClick={onPrimary} type="button">{t("booking.continuePrevious")}</button>
            <button disabled={isBusy} onClick={onSecondary} type="button">{t("booking.startNew")}</button>
          </>
        ) : (
          <>
            <button className="secondary" disabled={isBusy} onClick={onCancel} type="button">{t("booking.backCounselors")}</button>
            <button className="secondary" disabled={isBusy} onClick={onSecondary} type="button">{t("booking.cancel")}</button>
            <button disabled={isBusy} onClick={onPrimary} type="button">{t("booking.enterRoom")}</button>
          </>
        )}
      </div>
    </section>
  );
}
