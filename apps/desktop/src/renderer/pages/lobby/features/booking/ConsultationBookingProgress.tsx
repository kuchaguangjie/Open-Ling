import "./consultation-entry-choice.css";
import { useLingua } from "../../../../localization/useLingua";

export function ConsultationBookingProgress({ counselorName }: { counselorName: string }) {
  const { t } = useLingua();
  return (
    <section aria-labelledby="consultation-booking-progress-title" className="consultation-entry-choice" role="status">
      <p>{t("booking.with").replace("{name}", counselorName)}</p>
      <h2 id="consultation-booking-progress-title">{t("booking.preparing")}</h2>
      <p>{t("booking.preparingBody")}</p>
      <div aria-hidden="true" className="consultation-booking-progress-indicator">···</div>
    </section>
  );
}
