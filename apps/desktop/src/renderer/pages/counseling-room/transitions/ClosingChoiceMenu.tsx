export function ClosingChoiceMenu({
  busy,
  onLeave,
  onOpenHistory,
  onReadLetter,
  onResume,
  resumeBlockedReason
}: {
  busy?: boolean;
  onLeave: () => void;
  onOpenHistory: () => void;
  onReadLetter: () => void;
  onResume?: () => void;
  resumeBlockedReason?: string;
}) {
  const { t } = useLingua();
  return (
    <div className="consultation-closing-panel">
      <div aria-label={t("closing.options")} className="consultation-closing-menu" role="group">
        <button disabled={busy} onClick={onOpenHistory} type="button">{t("closing.viewHistory")}</button>
        <button disabled={busy} onClick={onReadLetter} type="button">{t("closing.readLetter")}</button>
        {onResume && (
          <button disabled={busy || Boolean(resumeBlockedReason)} onClick={onResume} title={resumeBlockedReason} type="button">
            {t("closing.resume")}
          </button>
        )}
        <button className="secondary" disabled={busy} onClick={onLeave} type="button">{t("room.backLobby")}</button>
      </div>
      {onResume && resumeBlockedReason && <p className="consultation-history-error" role="status">{resumeBlockedReason}</p>}
    </div>
  );
}
import { useLingua } from "../../../localization/useLingua";
