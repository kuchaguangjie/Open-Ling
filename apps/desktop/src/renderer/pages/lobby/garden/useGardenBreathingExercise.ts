import { useCallback, useEffect, useState } from "react";
import { useLingua } from "../../../localization/useLingua";

export type GardenBreathingPhase = "inhale" | "exhale";
export type GardenBreathingStatus = "idle" | "running" | "paused";

const PHASE_DURATIONS: Record<GardenBreathingPhase, number> = {
  inhale: 4,
  exhale: 5
};

const ZH_MINDFULNESS_GUIDANCE = [
  "“不能控制潮水，但可以学习冲浪。”",
  "“念头可以飞过，不必让它筑巢。”",
  "“云朵来去，天空仍有自己的颜色。”",
  "“让感受经过，不必急着解释。”",
  "“注意飘远，也可以温柔回来。”",
  "“此刻不需要被改变。”",
  "“先听见呼吸，再听见自己。”",
  "“放下评判，只感受这一刻。”",
  "“情绪会流动，你不必追赶。”",
  "“身体在这里，呼吸也在这里。”"
] as const;

const EN_MINDFULNESS_GUIDANCE = [
  "“You cannot control the waves, but you can learn to surf.”",
  "“Thoughts may fly overhead without building a nest.”",
  "“Clouds come and go; the sky keeps its own color.”",
  "“Let the feeling pass through without rushing to explain it.”",
  "“Attention can wander, and return gently.”",
  "“This moment does not need to be changed.”",
  "“First hear the breath, then hear yourself.”",
  "“Set judgment down and feel this moment.”",
  "“Emotions move; you do not have to chase them.”",
  "“Your body is here, and your breath is here.”"
] as const;

function pickGuidanceIndex(currentIndex = -1) {
  if (currentIndex < 0) {
    return Math.floor(Math.random() * ZH_MINDFULNESS_GUIDANCE.length);
  }

  const randomIndex = Math.floor(Math.random() * (ZH_MINDFULNESS_GUIDANCE.length - 1));
  return randomIndex >= currentIndex ? randomIndex + 1 : randomIndex;
}

export function useGardenBreathingExercise() {
  const { locale, l } = useLingua();
  const [status, setStatus] = useState<GardenBreathingStatus>("idle");
  const [phase, setPhase] = useState<GardenBreathingPhase>("inhale");
  const [guidanceIndex, setGuidanceIndex] = useState(() => pickGuidanceIndex());

  const completePhase = useCallback((completedPhase: GardenBreathingPhase) => {
    setPhase((currentPhase) => {
      if (currentPhase !== completedPhase) return currentPhase;
      setGuidanceIndex((index) => pickGuidanceIndex(index));
      return currentPhase === "inhale" ? "exhale" : "inhale";
    });
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setTimeout(() => completePhase(phase), PHASE_DURATIONS[phase] * 1000 + 120);
    return () => window.clearTimeout(timer);
  }, [completePhase, phase, status]);

  const start = () => {
    setPhase("inhale");
    setGuidanceIndex((index) => pickGuidanceIndex(index));
    setStatus("running");
  };

  const reset = () => {
    setPhase("inhale");
    setGuidanceIndex((index) => pickGuidanceIndex(index));
    setStatus("idle");
  };

  const togglePause = () => {
    setStatus((current) => {
      if (current === "running") return "paused";
      if (current === "paused") return "running";
      return current;
    });
  };

  return {
    completePhase: () => completePhase(phase),
    duration: PHASE_DURATIONS[phase],
    guidance: (locale === "en-US" ? EN_MINDFULNESS_GUIDANCE : ZH_MINDFULNESS_GUIDANCE)[guidanceIndex],
    phase,
    phaseLabel: phase === "inhale" ? l("吸气", "Inhale") : l("呼气", "Exhale"),
    reset,
    start,
    status,
    togglePause
  };
}

export type GardenBreathingExercise = ReturnType<typeof useGardenBreathingExercise>;
