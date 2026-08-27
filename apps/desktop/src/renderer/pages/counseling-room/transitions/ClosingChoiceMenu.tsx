export function ClosingChoiceMenu({
  busy,
  onLeave,
  onOpenHistory,
  onReadLetter
}: {
  busy?: boolean;
  onLeave: () => void;
  onOpenHistory: () => void;
  onReadLetter: () => void;
}) {
  const { t } = useLingua();
  return (
    <div className="consultation-closing-panel">
      <div aria-label={t("closing.options")} className="consultation-closing-menu" role="group">
        <button disabled={busy} onClick={onOpenHistory} type="button">{t("closing.viewHistory")}</button>
        <button disabled={busy} onClick={onReadLetter} type="button">{t("closing.readLetter")}</button>
        <button className="secondary" disabled={busy} onClick={onLeave} type="button">{t("room.backLobby")}</button>
      </div>
    </div>
  );
}
import { useLingua } from "../../../localization/useLingua";
