import { useEffect, useState } from "react";
import type { CounselorFaceFrames, CounselorFaceOverlays } from "../../../flows/consultation/counselorFlowAssets";
import { preloadDecodedImage } from "../../../media/imagePreload";
import { useCounselorFaceMotion } from "./useCounselorFaceMotion";
import { useCounselorDialogueFaceOverlays } from "./useCounselorDialogueFaceOverlays";

export function CounselorDialoguePortrait({
  counselorName,
  frames,
  overlays,
  speaking
}: {
  counselorName: string;
  frames?: CounselorFaceFrames;
  overlays?: CounselorFaceOverlays;
  speaking: boolean;
}) {
  const [motionFramesReady, setMotionFramesReady] = useState(false);
  const [neutralFailed, setNeutralFailed] = useState(false);
  const usesOverlays = Boolean(overlays);
  const { face, reducedMotion } = useCounselorFaceMotion({ enabled: motionFramesReady && !usesOverlays, speaking });
  const { eyeFrame, mouthFrame } = useCounselorDialogueFaceOverlays({
    enabled: motionFramesReady && usesOverlays,
    reducedMotion,
    speaking
  });

  useEffect(() => {
    setMotionFramesReady(false);
    setNeutralFailed(false);
    if (!frames || reducedMotion) return;
    let cancelled = false;
    const sources = usesOverlays
      ? Object.values(overlays ?? {})
      : Object.values(frames).filter((source) => source !== frames.neutral);
    sources.reduce(
      (task, source) => task.then(() => preloadDecodedImage(source)),
      Promise.resolve()
    )
      .then(() => {
        if (!cancelled) setMotionFramesReady(true);
      })
      .catch(() => {
        if (!cancelled) setMotionFramesReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [frames, overlays, reducedMotion, usesOverlays]);

  if (!frames || neutralFailed) return null;

  return (
    <div aria-hidden="true" className="consultation-dialogue-portrait-frame">
      <img
        alt=""
        className="consultation-dialogue-portrait"
        data-face-state={motionFramesReady && !reducedMotion && !usesOverlays ? face : "neutral"}
        decoding="async"
        onError={() => {
          if (face === "neutral" || !motionFramesReady) setNeutralFailed(true);
          else setMotionFramesReady(false);
        }}
        src={motionFramesReady && !reducedMotion && !usesOverlays ? frames[face] : frames.neutral}
        title={counselorName}
      />
      {usesOverlays && motionFramesReady && !reducedMotion && (
        <span
          className="consultation-dialogue-face-motion"
          data-eye-frame={eyeFrame}
          data-mouth-frame={mouthFrame}
          data-testid="counselor-dialogue-face-motion"
        >
          {eyeFrame === "closed" && <img alt="" className="consultation-dialogue-portrait consultation-dialogue-face-layer" src={overlays?.eyesClosed} />}
          {mouthFrame === "slight" && <img alt="" className="consultation-dialogue-portrait consultation-dialogue-face-layer" src={overlays?.mouthSlight} />}
          {mouthFrame === "open" && <img alt="" className="consultation-dialogue-portrait consultation-dialogue-face-layer" src={overlays?.mouthOpen} />}
        </span>
      )}
    </div>
  );
}
