import { useEffect, useRef, useState, type CSSProperties } from "react";
import { preloadDecodedImage, preloadImagesWhenIdle } from "../../../media/imagePreload";
import { useLingua } from "../../../localization/useLingua";
import {
  receptionCounselorAssets,
  receptionDeskClipPath,
  resolveReceptionCounselorId,
  type ReceptionSceneState
} from "../reception/receptionCounselorAssets";

export function ReceptionCounselorScenePortrait({
  counselorId,
  counselorName,
  state
}: {
  counselorId: string;
  counselorName: string;
  state: ReceptionSceneState;
}) {
  const { t } = useLingua();
  const resolvedCounselorId = resolveReceptionCounselorId(counselorId);
  const counselor = receptionCounselorAssets[resolvedCounselorId];
  const requestedPortrait = counselor.scene[state];
  const [displayedPortrait, setDisplayedPortrait] = useState({
    counselorId: resolvedCounselorId,
    counselorName,
    portrait: requestedPortrait
  });
  const displayedPortraitRef = useRef(displayedPortrait);
  const portraitRequestRef = useRef(0);
  const [eyeFrame, setEyeFrame] = useState<"open" | "closed">("open");
  const [blinkFrameReady, setBlinkFrameReady] = useState(false);

  useEffect(() => {
    const requestId = portraitRequestRef.current + 1;
    portraitRequestRef.current = requestId;
    let cancelled = false;
    if (displayedPortraitRef.current.portrait.url === requestedPortrait.url) {
      const nextPortrait = { counselorId: resolvedCounselorId, counselorName, portrait: requestedPortrait };
      displayedPortraitRef.current = nextPortrait;
      setDisplayedPortrait(nextPortrait);
      return;
    }
    void preloadDecodedImage(requestedPortrait.url)
      .then(() => {
        if (cancelled || portraitRequestRef.current !== requestId) return;
        const nextPortrait = { counselorId: resolvedCounselorId, counselorName, portrait: requestedPortrait };
        displayedPortraitRef.current = nextPortrait;
        setDisplayedPortrait(nextPortrait);
      })
      .catch(() => {
        // Keep the current scene portrait visible when the requested frame fails.
      });
    return () => {
      cancelled = true;
    };
  }, [counselorName, requestedPortrait, resolvedCounselorId]);

  useEffect(() => {
    const controller = new AbortController();
    const deferredUrls = Object.values(counselor.scene).flatMap(({ eyesClosedUrl, url }) => [url, eyesClosedUrl])
      .filter((url) => url !== requestedPortrait.url);
    void preloadImagesWhenIdle(deferredUrls, { signal: controller.signal });
    return () => controller.abort();
  }, [counselor, requestedPortrait.url]);

  const portrait = displayedPortrait.portrait;

  useEffect(() => {
    setBlinkFrameReady(false);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    void preloadDecodedImage(portrait.eyesClosedUrl)
      .then(() => {
        if (!cancelled) setBlinkFrameReady(true);
      })
      .catch(() => {
        if (!cancelled) setBlinkFrameReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portrait.eyesClosedUrl]);

  useEffect(() => {
    setEyeFrame("open");
    if (!blinkFrameReady || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const timers: number[] = [];
    const scheduleBlink = () => {
      const idleDelay = 6_000 + Math.round(Math.random() * 2_000);
      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        setEyeFrame("closed");
        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          setEyeFrame("open");
          scheduleBlink();
        }, 130 + Math.round(Math.random() * 20)));
      }, idleDelay));
    };
    scheduleBlink();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [blinkFrameReady, resolvedCounselorId, state]);

  const portraitStyle = {
    height: `${portrait.placement.scale}%`,
    left: `calc(50% + ${portrait.placement.x}%)`,
    top: `${portrait.placement.y}%`
  } as CSSProperties;

  return (
    <div
      className="lobby-reception-counselor-viewport"
      data-counselor-id={displayedPortrait.counselorId}
      data-eye-frame={eyeFrame}
      data-reception-state={state}
      data-testid="reception-counselor-scene-portrait"
      style={{ clipPath: receptionDeskClipPath }}
    >
      <span className="lobby-reception-counselor-portrait-stack" style={portraitStyle}>
        <span className="lobby-reception-counselor-portrait-motion">
          <img
            alt={t("reception.scenePortraitAlt")}
            className="lobby-reception-counselor-portrait"
            decoding="async"
            src={portrait.url}
          />
          {eyeFrame === "closed" && (
            <img aria-hidden="true" alt="" className="lobby-reception-counselor-portrait" decoding="async" src={portrait.eyesClosedUrl} />
          )}
        </span>
      </span>
    </div>
  );
}
