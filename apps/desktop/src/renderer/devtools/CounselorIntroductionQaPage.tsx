import { useState } from "react";
import { CounselorIntroductionFeature } from "../pages/lobby/features/counselors/CounselorIntroductionFeature";
import { LobbyFeatureFrame } from "../pages/lobby/features/LobbyFeatureFrame";

export function CounselorIntroductionQaPage() {
  const requestedCounselorId = new URLSearchParams(window.location.search).get("counselor");
  const initialCounselorId = requestedCounselorId === "chengling" || requestedCounselorId === "linleshui"
    ? requestedCounselorId
    : "zhouzhou";
  const [selectedCounselorId, setSelectedCounselorId] = useState(initialCounselorId);

  return (
    <LobbyFeatureFrame
      archiveLabel="咨询师介绍响应式预览"
      className="lobby-overlay-counselors"
      closeLabel="关闭咨询师介绍"
      title="咨询师介绍"
    >
      <CounselorIntroductionFeature
        mode="introduction"
        onBook={() => undefined}
        onCounselorChange={setSelectedCounselorId}
        selectedCounselorId={selectedCounselorId}
      />
    </LobbyFeatureFrame>
  );
}
