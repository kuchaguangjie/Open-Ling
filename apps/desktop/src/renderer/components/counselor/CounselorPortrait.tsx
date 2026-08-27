import { useEffect, useRef, useState } from "react";
import type { CounselorStatus } from "../../stores/sessionStore";
import { getCounselorPortraitForStatus, getCounselorPortraitPose } from "./counselorPortraitAssets";
import { getCounselorPortraitMotion } from "./counselorPortraitMotion";
import { CounselorPortraitFaceMotion } from "./CounselorPortraitFaceMotion";
import { preloadDecodedImage } from "../../media/imagePreload";
import { useLingua } from "../../localization/useLingua";

interface CounselorPortraitProps {
  counselorId: string;
  counselorName: string;
  status: CounselorStatus;
}

interface PortraitLayer {
  counselorId: string;
  counselorName: string;
  motionClassName: string;
  motionState: string;
  poseClassName: string;
  src: string;
  status: CounselorStatus;
}

const portraitCrossfadeMs = 520;

export function CounselorPortrait({ counselorId, counselorName, status }: CounselorPortraitProps) {
  const { t } = useLingua();
  const motion = getCounselorPortraitMotion(status);
  const portrait = getCounselorPortraitForStatus(counselorId, status);
  const poseClassName = `portrait-pose-${getCounselorPortraitPose(status)}`;
  const requestedLayer = {
    counselorId,
    counselorName,
    motionClassName: motion.className,
    motionState: motion.state,
    poseClassName,
    src: portrait,
    status
  };
  const [activeLayer, setActiveLayer] = useState<PortraitLayer>(requestedLayer);
  const activeLayerRef = useRef<PortraitLayer>(requestedLayer);
  const imageRequestRef = useRef(0);
  const transitionTimerRef = useRef<number | null>(null);
  const [exitingLayer, setExitingLayer] = useState<PortraitLayer | null>(null);

  useEffect(() => {
    const previousLayer = activeLayerRef.current;
    const requestId = imageRequestRef.current + 1;
    imageRequestRef.current = requestId;
    if (previousLayer.counselorId !== requestedLayer.counselorId) {
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
      activeLayerRef.current = requestedLayer;
      setExitingLayer(null);
      setActiveLayer(requestedLayer);
      void preloadDecodedImage(requestedLayer.src).catch(() => undefined);
      return;
    }
    if (previousLayer.src === requestedLayer.src) {
      activeLayerRef.current = requestedLayer;
      setActiveLayer(requestedLayer);
      return;
    }

    let cancelled = false;
    void preloadDecodedImage(requestedLayer.src)
      .then(() => {
        if (cancelled || imageRequestRef.current !== requestId) return;
        const currentLayer = activeLayerRef.current;
        activeLayerRef.current = requestedLayer;

        setExitingLayer(currentLayer);
        setActiveLayer(requestedLayer);
        if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = window.setTimeout(() => {
          transitionTimerRef.current = null;
          setExitingLayer(null);
        }, portraitCrossfadeMs);
      })
      .catch(() => {
        // Keep the current decoded portrait visible when the requested frame fails.
      });

    return () => {
      cancelled = true;
    };
  }, [
    requestedLayer.counselorId,
    requestedLayer.counselorName,
    requestedLayer.motionClassName,
    requestedLayer.motionState,
    requestedLayer.poseClassName,
    requestedLayer.src,
    requestedLayer.status
  ]);

  useEffect(() => {
    if (activeLayer.counselorId !== counselorId) {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      setExitingLayer(null);
    }
  }, [activeLayer.counselorId, counselorId]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`portrait-person ${activeLayer.motionClassName}`} data-counselor-id={activeLayer.counselorId} data-portrait-state={activeLayer.motionState}>
      {exitingLayer && (
        <img
          alt=""
          aria-hidden="true"
          className={`portrait-image-layer portrait-image-exiting ${exitingLayer.motionClassName} ${exitingLayer.poseClassName}`}
          data-portrait-layer="exiting"
          decoding="async"
          src={exitingLayer.src}
        />
      )}
      <span
        className={`portrait-frame ${motion.className} ${poseClassName} ${
          exitingLayer ? "portrait-image-entering" : "portrait-image-ready"
        }`}
        data-portrait-layer="active"
      >
        <img
          alt={t("counselors.portraitAlt").replace("{name}", activeLayer.counselorName)}
          className={`portrait-image-layer portrait-image-active ${exitingLayer ? "portrait-image-entering" : "portrait-image-ready"}`}
          decoding="async"
          key={activeLayer.src}
          src={activeLayer.src}
        />
        <CounselorPortraitFaceMotion counselorId={activeLayer.counselorId} status={activeLayer.status} />
      </span>
    </div>
  );
}
