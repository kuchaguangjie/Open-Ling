import { useEffect, useState } from "react";

type EyeFrame = "open" | "closed";
type MouthFrame = "neutral" | "slight" | "open";

const blinkDelayMinMs = 6_000;
const blinkDelayMaxMs = 8_000;
const blinkClosedMinMs = 130;
const blinkClosedMaxMs = 150;
const speakingFrameMs = 170;

function randomDuration(min: number, max: number) {
  return min + Math.round(Math.random() * (max - min));
}

export function useCounselorDialogueFaceOverlays({ enabled, reducedMotion, speaking }: {
  enabled: boolean;
  reducedMotion: boolean;
  speaking: boolean;
}) {
  const [eyeFrame, setEyeFrame] = useState<EyeFrame>("open");
  const [mouthFrame, setMouthFrame] = useState<MouthFrame>("neutral");

  useEffect(() => {
    setEyeFrame("open");
    if (!enabled || reducedMotion) return;
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
  }, [enabled, reducedMotion]);

  useEffect(() => {
    setMouthFrame("neutral");
    if (!enabled || reducedMotion || !speaking) return;
    const speakingFrames: MouthFrame[] = ["slight", "open", "slight", "neutral"];
    let index = 0;
    setMouthFrame(speakingFrames[index]);
    const interval = window.setInterval(() => {
      index = (index + 1) % speakingFrames.length;
      setMouthFrame(speakingFrames[index]);
    }, speakingFrameMs);
    return () => window.clearInterval(interval);
  }, [enabled, reducedMotion, speaking]);

  return { eyeFrame, mouthFrame };
}
