import type { CounselorStatus } from "../../../stores/sessionStore";
import "./stage.css";
import { RoomBackgroundLayer } from "./background/RoomBackgroundLayer";
import { CounselorPortraitStage } from "./portrait/CounselorPortraitStage";
import { useLingua } from "../../../localization/useLingua";
import { getCounselorVisualAssets } from "../../../components/counselor/counselorPortraitAssets";

export interface CounselingRoomStageProps {
  counselorId: string;
  counselorName: string;
  status: CounselorStatus;
  statusText: string;
  statusQuote: string;
}

export function CounselingRoomStage(props: CounselingRoomStageProps) {
  const { t } = useLingua();
  const usesUnifiedRoomBackground = getCounselorVisualAssets(props.counselorId).usesUnifiedRoomBackground;
  return (
    <aside className="context-panel" aria-label={t("stage.currentInfo")}>
      <section className="portrait-card">
        {!usesUnifiedRoomBackground && <RoomBackgroundLayer />}
        <CounselorPortraitStage counselorId={props.counselorId} counselorName={props.counselorName} status={props.status} />
      </section>
    </aside>
  );
}
