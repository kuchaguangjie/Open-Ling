import { builtinCounselorPackages, toCounselor } from "@shared/index";
import type { LobbyFeatureId } from "../features/lobbyFeatureRegistry";
import { SceneHotspot } from "./SceneHotspot";
import "./lobby-hotspots.css";
import { useLingua } from "../../../localization/useLingua";

export function LobbyHotspotLayer({
  disabled,
  onOpenDialogue,
  onOpenFeature,
  onOpenGarden,
  onPrepareFeature
}: {
  disabled: boolean;
  onOpenDialogue: () => void;
  onOpenFeature: (featureId: LobbyFeatureId, counselorId?: string) => void;
  onOpenGarden: () => void;
  onPrepareFeature: (featureId: LobbyFeatureId, counselorId?: string) => void;
}) {
  const { locale, t } = useLingua();
  const counselors = builtinCounselorPackages.map((manifest) => toCounselor(manifest, locale));
  return (
    <>
      <SceneHotspot ariaLabel={t("hotspot.receptionAria")} className="lobby-hotspot-renxin" disabled={disabled} label={t("hotspot.reception")} onClick={onOpenDialogue} />
      <SceneHotspot ariaLabel={t("hotspot.bookcaseAria")} className="lobby-hotspot-bookcase" disabled={disabled} label={t("hotspot.bookcase")} onClick={() => onOpenFeature("bookcase")} onIntent={() => onPrepareFeature("bookcase")} />
      <SceneHotspot ariaLabel={t("hotspot.photoAria")} className="lobby-hotspot-photo" disabled={disabled} label={t("hotspot.photo")} onClick={() => onOpenFeature("photo")} />
      <SceneHotspot ariaLabel={t("hotspot.gardenAria")} className="lobby-hotspot-window" disabled={disabled} label={t("hotspot.garden")} onClick={onOpenGarden} />
      <SceneHotspot ariaLabel={t("hotspot.resourcesAria")} className="lobby-hotspot-resources" disabled={disabled} label={t("hotspot.resources")} onClick={() => onOpenFeature("resources")} />
      <SceneHotspot ariaLabel={t("hotspot.recordsAria")} className="lobby-hotspot-letters" disabled={disabled} label={t("hotspot.records")} onClick={() => onOpenFeature("records")} />

      <div aria-label={t("features.counselors.title")} className="lobby-counselor-hotspots">
        {counselors.map((counselor) => (
          <SceneHotspot
            ariaLabel={t("hotspot.meetCounselor").replace("{name}", counselor.name)}
            className={`lobby-hotspot-counselor lobby-hotspot-counselor-${counselor.id}`}
            disabled={disabled}
            key={counselor.id}
            label={counselor.name}
            onClick={() => onOpenFeature("counselors", counselor.id)}
            onIntent={() => onPrepareFeature("counselors", counselor.id)}
          />
        ))}
      </div>
    </>
  );
}
