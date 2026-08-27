import studioLogoUrl from "../../../../../../../../assets/runtime/lobby/resource-table/brand/qunxin-studio-logo-final-v1.png";
import { useLingua } from "../../../../localization/useLingua";
import "./studio-signature.css";

export function StudioSignature({ label }: { label: string }) {
  const { t } = useLingua();
  return (
    <div className="studio-signature">
      <img alt="" aria-hidden="true" src={studioLogoUrl} />
      <span>
        <strong>{t("brand.studio")}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}
