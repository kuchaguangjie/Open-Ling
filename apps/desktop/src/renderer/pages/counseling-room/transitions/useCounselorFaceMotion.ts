import { useEffect, useState } from "react";
import type { CounselorFaceState } from "../../../flows/consultation/counselorFlowAssets";

function readReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCounselorFaceMotion({ enabled = true, speaking }: { enabled?: boolean; speaking: boolean }) {
  const [face, setFace] = useState<CounselorFaceState>("neutral");
  const [reducedMotion, setReducedMotion] = useState(readReducedMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!enabled || reducedMotion) {
      setFace("neutral");
      return;
    }
    if (speaking) {
      const speakingFrames: CounselorFaceState[] = ["neutral", "mouth-slight", "mouth-open", "mouth-slight"];
      let index = 0;
      setFace(speakingFrames[index]);
      const interval = window.setInterval(() => {
        index = (index + 1) % speakingFrames.length;
        setFace(speakingFrames[index]);
      }, 170);
      return () => {
        window.clearInterval(interval);
        setFace("neutral");
      };
    }

    let cancelled = false;
    const timers: number[] = [];
    const scheduleBlink = () => {
      const timer = window.setTimeout(() => {
        if (cancelled) return;
        setFace("eyes-half");
        const remainingSequence: CounselorFaceState[] = ["eyes-closed", "eyes-half", "neutral"];
        remainingSequence.forEach((nextFace, index) => {
          timers.push(window.setTimeout(() => setFace(nextFace), (index + 1) * 70));
        });
        timers.push(window.setTimeout(scheduleBlink, (remainingSequence.length + 1) * 70));
      }, 2500 + Math.round(Math.random() * 2500));
      timers.push(timer);
    };
    setFace("neutral");
    scheduleBlink();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      setFace("neutral");
    };
  }, [enabled, reducedMotion, speaking]);

  return { face, reducedMotion };
}
