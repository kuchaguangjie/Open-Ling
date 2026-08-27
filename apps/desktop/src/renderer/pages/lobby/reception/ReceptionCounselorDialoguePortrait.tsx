import { useEffect, useState, type CSSProperties } from "react";
import { preloadDecodedImage } from "../../../media/imagePreload";
import { useLingua } from "../../../localization/useLingua";
import { receptionCounselorAssets, resolveReceptionCounselorId } from "./receptionCounselorAssets";

export function ReceptionCounselorDialoguePortrait({
  counselorId,
  counselorName,
  isSpeaking,
  prefersReducedMotion
}: {
  counselorId: string;
  counselorName: string;
  isSpeaking: boolean;
  prefersReducedMotion: boolean;
}) {
  const { t } = useLingua();
  const resolvedCounselorId = resolveReceptionCounselorId(counselorId);
  const portrait = receptionCounselorAssets[resolvedCounselorId].dialogue;
  const [eyeFrame, setEyeFrame] = useState<"open" | "closed">("open");
  const [mouthFrame, setMouthFrame] = useState<"neutral" | "slight" | "open">("neutral");
  const [animationFramesReady, setAnimationFramesReady] = useState(false);
  const portraitStyle = {
    bottom: `calc(-8% - ${portrait.placement.y}%)`,
    height: `${portrait.placement.scale}%`,
    left: `calc(50% + ${portrait.placement.x}%)`
  } as CSSProperties;

  useEffect(() => {
    setAnimationFramesReady(false);
    if (prefersReducedMotion) return;
    let cancelled = false;
    [portrait.eyesClosedUrl, portrait.mouthSlightUrl, portrait.mouthOpenUrl]
      .reduce((task, source) => task.then(() => preloadDecodedImage(source)), Promise.resolve())
      .then(() => {
        if (!cancelled) setAnimationFramesReady(true);
      })
      .catch(() => {
        if (!cancelled) setAnimationFramesReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portrait, prefersReducedMotion]);

  useEffect(() => {
    setEyeFrame("open");
    if (prefersReducedMotion || !animationFramesReady) return;
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
  }, [animationFramesReady, prefersReducedMotion, resolvedCounselorId]);

  useEffect(() => {
    setMouthFrame("neutral");
    if (prefersReducedMotion || !animationFramesReady || !isSpeaking) return;
    const frames: Array<"neutral" | "slight" | "open"> = ["slight", "open", "slight", "neutral"];
    let index = 0;
    setMouthFrame(frames[index]);
    const timer = window.setInterval(() => {
      index = (index + 1) % frames.length;
      setMouthFrame(frames[index]);
    }, 170);
    return () => window.clearInterval(timer);
  }, [animationFramesReady, isSpeaking, prefersReducedMotion, resolvedCounselorId]);

  return (
    <div
      className="lobby-dialogue-portrait lobby-dialogue-counselor-portrait"
      data-counselor-id={resolvedCounselorId}
      data-eye-frame={eyeFrame}
      data-mouth-frame={mouthFrame}
      data-speaking={isSpeaking && animationFramesReady && !prefersReducedMotion ? "true" : "false"}
      data-testid="reception-counselor-dialogue-portrait"
      style={portraitStyle}
    >
      <img
        alt={t("reception.dialoguePortraitAlt")}
        className="lobby-dialogue-portrait-layer"
        decoding="async"
        src={portrait.staticUrl}
      />
      {mouthFrame === "slight" && <img aria-hidden="true" alt="" className="lobby-dialogue-portrait-layer" src={portrait.mouthSlightUrl} />}
      {mouthFrame === "open" && <img aria-hidden="true" alt="" className="lobby-dialogue-portrait-layer" src={portrait.mouthOpenUrl} />}
      {eyeFrame === "closed" && <img aria-hidden="true" alt="" className="lobby-dialogue-portrait-layer" src={portrait.eyesClosedUrl} />}
    </div>
  );
}
