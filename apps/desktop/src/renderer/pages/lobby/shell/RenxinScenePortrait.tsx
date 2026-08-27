import { useEffect, useState } from "react";
import renxinEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/renxin/redesign/scene-logo-production/layers/renxin-eyes-closed.png";
import renxinEyesHalfUrl from "../../../../../../../assets/runtime/lobby/receptionist/renxin/redesign/scene-logo-production/layers/renxin-eyes-half.png";
import { preloadDecodedImage } from "../../../media/imagePreload";
import { useLingua } from "../../../localization/useLingua";
import { renxinSceneBaseUrl, renxinSceneEyesOpenUrl } from "../lobbyCriticalAssets";

type EyeFrame = "open" | "half" | "closed";

const eyeFrameUrls: Record<EyeFrame, string> = {
  closed: renxinEyesClosedUrl,
  half: renxinEyesHalfUrl,
  open: renxinSceneEyesOpenUrl
};

export function RenxinScenePortrait() {
  const { l } = useLingua();
  const [eyeFrame, setEyeFrame] = useState<EyeFrame>("open");
  const [blinkFramesReady, setBlinkFramesReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    [renxinEyesHalfUrl, renxinEyesClosedUrl]
      .reduce(
        (task, source) => task.then(() => preloadDecodedImage(source)),
        Promise.resolve()
      )
      .then(() => {
        if (!cancelled) setBlinkFramesReady(true);
      })
      .catch(() => {
        if (!cancelled) setBlinkFramesReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setEyeFrame("open");
    if (!blinkFramesReady || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const timers: number[] = [];
    const scheduleBlink = () => {
      const idleDelay = 4_600 + Math.round(Math.random() * 3_800);
      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        setEyeFrame("half");
        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          setEyeFrame("closed");
          timers.push(window.setTimeout(() => {
            if (cancelled) return;
            setEyeFrame("half");
            timers.push(window.setTimeout(() => {
              if (cancelled) return;
              setEyeFrame("open");
              scheduleBlink();
            }, 60));
          }, 85));
        }, 60));
      }, idleDelay));
    };

    scheduleBlink();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [blinkFramesReady]);

  return (
    <div className="lobby-renxin-scene" data-eye-frame={eyeFrame} data-testid="renxin-scene-portrait">
      <img alt={l("任心在前台后", "Ren Xin behind the reception desk")} className="lobby-renxin-scene-layer" decoding="async" src={renxinSceneBaseUrl} />
      <img aria-hidden="true" alt="" className="lobby-renxin-scene-layer" decoding="async" src={eyeFrameUrls[eyeFrame]} />
    </div>
  );
}
