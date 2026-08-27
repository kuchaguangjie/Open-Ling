import { useEffect, useState } from "react";
import renxinEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/renxin/dialogue-legacy-production/hd-frames/eyes-closed.png";
import renxinMouthMediumUrl from "../../../../../../../assets/runtime/lobby/receptionist/renxin/dialogue-legacy-production/hd-frames/mouth-medium.png";
import renxinMouthSmallUrl from "../../../../../../../assets/runtime/lobby/receptionist/renxin/dialogue-legacy-production/hd-frames/mouth-small.png";
import { preloadDecodedImage } from "../../../media/imagePreload";
import { useLingua } from "../../../localization/useLingua";
import { renxinDialogueEyesOpenUrl } from "../lobbyCriticalAssets";

type EyeFrame = "open" | "closed";
type MouthFrame = "closed" | "small" | "medium";

const eyeFrameUrls: Record<EyeFrame, string> = {
  closed: renxinEyesClosedUrl,
  open: renxinDialogueEyesOpenUrl
};

const mouthFrameUrls: Record<MouthFrame, string> = {
  closed: renxinDialogueEyesOpenUrl,
  medium: renxinMouthMediumUrl,
  small: renxinMouthSmallUrl
};

export function RenxinDialoguePortrait({
  isSpeaking,
  prefersReducedMotion
}: {
  isSpeaking: boolean;
  prefersReducedMotion: boolean;
}) {
  const { l } = useLingua();
  const [eyeFrame, setEyeFrame] = useState<EyeFrame>("open");
  const [mouthFrame, setMouthFrame] = useState<MouthFrame>("closed");
  const [animationFramesReady, setAnimationFramesReady] = useState(false);

  useEffect(() => {
    setAnimationFramesReady(false);
    if (prefersReducedMotion) return;
    let cancelled = false;
    [renxinEyesClosedUrl, renxinMouthSmallUrl, renxinMouthMediumUrl]
      .reduce(
        (task, source) => task.then(() => preloadDecodedImage(source)),
        Promise.resolve()
      )
      .then(() => {
        if (!cancelled) setAnimationFramesReady(true);
      })
      .catch(() => {
        if (!cancelled) setAnimationFramesReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !animationFramesReady) {
      setEyeFrame("open");
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const scheduleBlink = () => {
      const idleDelay = 3_800 + Math.round(Math.random() * 3_400);
      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        setEyeFrame("closed");
        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          setEyeFrame("open");
          scheduleBlink();
        }, 105));
      }, idleDelay));
    };

    scheduleBlink();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [animationFramesReady, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !animationFramesReady || !isSpeaking) {
      setMouthFrame("closed");
      return;
    }

    const frames: MouthFrame[] = ["small", "medium", "small", "closed"];
    let frameIndex = 1;
    setMouthFrame(frames[0]);
    const timer = window.setInterval(() => {
      setMouthFrame(frames[frameIndex]);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 95);
    return () => window.clearInterval(timer);
  }, [animationFramesReady, isSpeaking, prefersReducedMotion]);

  return (
    <div
      className="lobby-dialogue-portrait"
      data-eye-frame={eyeFrame}
      data-mouth-frame={mouthFrame}
      data-speaking={isSpeaking && animationFramesReady && !prefersReducedMotion ? "true" : "false"}
      data-testid="renxin-dialogue-portrait"
    >
      <img
        alt={l("任心对话立绘", "Portrait of Ren Xin in conversation")}
        className="lobby-dialogue-portrait-layer lobby-dialogue-portrait-layer-pixel-hd"
        decoding="async"
        src={eyeFrame === "open" ? mouthFrameUrls[mouthFrame] : eyeFrameUrls[eyeFrame]}
      />
    </div>
  );
}
