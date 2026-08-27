import type { ConsultationPreparation } from "@shared/index";
import { useLingua } from "../../../../localization/useLingua";

export function ConsultationPreparationCard({ preparation, onRetry }: { preparation?: ConsultationPreparation; onRetry: () => void }) {
  const { t } = useLingua();
  const status = preparation?.status ?? "pending";
  if (status === "ready" || status === "stale") return null;
  const failed = status === "failed";
  return (
    <article className={`consultation-preparation-card ${status}`} aria-label={t("preparation.aria")}>
      <div className="consultation-preparation-heading"><span aria-hidden="true" /><div><p>{t("preparation.heading")}</p><h2>{t(failed ? "preparation.failed" : "preparation.working")}</h2></div></div>
      <p>{failed ? preparation?.errorMessage ?? t("preparation.failedBody") : t("preparation.workingBody")}</p>
      {failed && <button type="button" onClick={onRetry}>{t("preparation.retry")}</button>}
    </article>
  );
}
