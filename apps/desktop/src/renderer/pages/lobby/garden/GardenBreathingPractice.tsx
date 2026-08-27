import type { CSSProperties } from "react";
import { useLingua } from "../../../localization/useLingua";
import type { GardenBreathingExercise } from "./useGardenBreathingExercise";

type GardenBreathingPracticeProps = {
  exercise: GardenBreathingExercise;
  musicPlaying: boolean;
  onExit: () => void;
  onMusicToggle: () => void;
  soundLabel: string;
};

export function GardenBreathingPractice({
  exercise,
  musicPlaying,
  onExit,
  onMusicToggle,
  soundLabel
}: GardenBreathingPracticeProps) {
  const { l } = useLingua();
  const isPaused = exercise.status === "paused";
  const breathStyle = {
    "--garden-breath-duration": `${exercise.duration}s`
  } as CSSProperties;

  return (
    <div
      aria-label={l("呼吸练习", "Breathing practice")}
      className={`garden-practice garden-practice-${exercise.phase}${isPaused ? " garden-practice-paused" : ""} ling-motion-content-swap`}
    >
      <div
        className="garden-breathing-aura"
        data-testid="garden-breathing-aura"
        key={exercise.phase}
        onAnimationEnd={(event) => {
          if (
            event.animationName === "garden-circle-inhale"
            || event.animationName === "garden-circle-exhale"
          ) {
            exercise.completePhase();
          }
        }}
        style={breathStyle}
      >
        <span aria-hidden="true" className="garden-breathing-inner-glow" />
        <p aria-live="polite">{isPaused ? l("慢慢来", "Take your time") : exercise.phaseLabel}</p>
      </div>
      <p className="garden-mindfulness-guidance" data-testid="garden-mindfulness-guidance" key={exercise.guidance}>
        {exercise.guidance}
      </p>
      <div className="garden-practice-controls" aria-label={l("呼吸练习控制", "Breathing-practice controls")}>
        <button onClick={exercise.togglePause} type="button">{isPaused ? l("继续", "Continue") : l("暂停", "Pause")}</button>
        <span aria-hidden="true" />
        <button aria-pressed={musicPlaying} onClick={onMusicToggle} type="button">
          {soundLabel} {musicPlaying ? l("开", "on") : l("关", "off")}
        </button>
        <span aria-hidden="true" />
        <button onClick={onExit} type="button">{l("结束练习", "End practice")}</button>
      </div>
    </div>
  );
}
