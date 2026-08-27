import { useEffect, useState } from "react";
import type { CounselorStatus } from "../../stores/sessionStore";
import { getCounselorPortraitFaceAssets, getCounselorPortraitFaceFrameStyle } from "./counselorPortraitFaceAssets";
import { preloadDecodedImage } from "../../media/imagePreload";

type EyeFrame = "open" | "closed";
type MouthFrame = "neutral" | "closed" | "slight" | "open";

const blinkDelayMinMs = 6_000;
const blinkDelayMaxMs = 8_000;
const blinkClosedMinMs = 130;
const blinkClosedMaxMs = 150;
const speakingFrameMs = 170;
const zhouzhouSpeechFrames: Array<{ frame: MouthFrame; duration: number }> = [
  { frame: "slight", duration: 110 },
  { frame: "open", duration: 135 },
  { frame: "slight", duration: 95 },
  { frame: "open", duration: 125 },
  { frame: "slight", duration: 105 },
  { frame: "closed", duration: 180 }
];

function randomDuration(min: number, max: number) {
  return min + Math.round(Math.random() * (max - min));
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

export function CounselorPortraitFaceMotion({ counselorId, status }: { counselorId: string; status: CounselorStatus }) {
  const assets = getCounselorPortraitFaceAssets(counselorId, status);
  const [eyeFrame, setEyeFrame] = useState<EyeFrame>("open");
  const [mouthFrame, setMouthFrame] = useState<MouthFrame>(counselorId === "zhouzhou" ? "closed" : "neutral");
  const reducedMotion = usePrefersReducedMotion();
  const eyesClosedSource = assets?.eyesClosed;
  const mouthSlightSource = assets?.mouthSlight;
  const mouthOpenSource = assets?.mouthOpen;

  useEffect(() => {
    if (!eyesClosedSource || reducedMotion) return;
    void preloadDecodedImage(eyesClosedSource, { priority: "idle" }).catch(() => undefined);
  }, [eyesClosedSource, reducedMotion]);

  useEffect(() => {
    if (!mouthSlightSource || !mouthOpenSource || reducedMotion) return;
    for (const source of [mouthSlightSource, mouthOpenSource]) {
      void preloadDecodedImage(source, { priority: "idle" }).catch(() => undefined);
    }
  }, [mouthOpenSource, mouthSlightSource, reducedMotion]);

  useEffect(() => {
    setEyeFrame("open");
    if (!eyesClosedSource || reducedMotion) return;
    let cancelled = false;
    const timers = new Set<number>();
    const later = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };
    const scheduleBlink = () => {
      later(() => {
        if (cancelled) return;
        setEyeFrame("closed");
        later(() => {
          if (cancelled) return;
          setEyeFrame("open");
          scheduleBlink();
        }, randomDuration(blinkClosedMinMs, blinkClosedMaxMs));
      }, randomDuration(blinkDelayMinMs, blinkDelayMaxMs));
    };
    scheduleBlink();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [counselorId, eyesClosedSource, reducedMotion, status]);

  useEffect(() => {
    const restingFrame: MouthFrame = counselorId === "zhouzhou" ? "closed" : "neutral";
    setMouthFrame(restingFrame);
    if (status !== "streaming" || !mouthSlightSource || !mouthOpenSource || reducedMotion) return;

    if (counselorId === "zhouzhou") {
      let cancelled = false;
      let timer: number | undefined;
      const showFrame = (index: number) => {
        if (cancelled) return;
        const step = zhouzhouSpeechFrames[index];
        setMouthFrame(step.frame);
        timer = window.setTimeout(() => showFrame((index + 1) % zhouzhouSpeechFrames.length), step.duration);
      };
      timer = window.setTimeout(() => showFrame(0), 80);
      return () => {
        cancelled = true;
        if (timer !== undefined) window.clearTimeout(timer);
      };
    }

    const speakingFrames: MouthFrame[] = ["slight", "open", "slight", "neutral"];
    let index = 0;
    setMouthFrame(speakingFrames[index]);
    const interval = window.setInterval(() => {
      index = (index + 1) % speakingFrames.length;
      setMouthFrame(speakingFrames[index]);
    }, speakingFrameMs);
    return () => {
      window.clearInterval(interval);
    };
  }, [counselorId, mouthOpenSource, mouthSlightSource, reducedMotion, status]);

  if (!assets) return null;
  return (
    <span
      aria-hidden="true"
      className="portrait-face-motion"
      data-eye-frame={eyeFrame}
      data-mouth-frame={mouthFrame}
      data-testid="counselor-portrait-face-motion"
    >
      {eyeFrame === "closed" && (
        <img
          alt=""
          className="portrait-face-motion-layer portrait-face-motion-eyes"
          src={assets.eyesClosed}
          style={getCounselorPortraitFaceFrameStyle(assets.eyesClosed)}
        />
      )}
      {mouthFrame === "slight" && assets.mouthSlight && (
        <img
          alt=""
          className="portrait-face-motion-layer portrait-face-motion-mouth"
          src={assets.mouthSlight}
          style={getCounselorPortraitFaceFrameStyle(assets.mouthSlight)}
        />
      )}
      {mouthFrame === "open" && assets.mouthOpen && (
        <img
          alt=""
          className="portrait-face-motion-layer portrait-face-motion-mouth"
          src={assets.mouthOpen}
          style={getCounselorPortraitFaceFrameStyle(assets.mouthOpen)}
        />
      )}
    </span>
  );
}
