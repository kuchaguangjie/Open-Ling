import type { CounselorStatus } from "../../../../stores/sessionStore";
import { CounselorPortrait } from "../../../../components/counselor/CounselorPortrait";

export function CounselorPortraitStage({ counselorId, counselorName, status }: { counselorId: string; counselorName: string; status: CounselorStatus }) {
  return <CounselorPortrait counselorId={counselorId} counselorName={counselorName} status={status} />;
}
