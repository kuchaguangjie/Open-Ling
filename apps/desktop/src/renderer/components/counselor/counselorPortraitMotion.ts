import type { CounselorStatus } from "../../stores/sessionStore";

export type CounselorPortraitState = "idle" | "listening" | "thinking" | "empathizing" | "responding" | "error-soft";

interface CounselorPortraitMotion {
  state: CounselorPortraitState;
  className: string;
}

const portraitMotionByStatus: Record<CounselorStatus, CounselorPortraitMotion> = {
  idle: { state: "idle", className: "portrait-motion-idle" },
  listening: { state: "listening", className: "portrait-motion-listening" },
  connecting: { state: "thinking", className: "portrait-motion-thinking" },
  thinking: { state: "thinking", className: "portrait-motion-thinking" },
  streaming: { state: "responding", className: "portrait-motion-responding" },
  error: { state: "error-soft", className: "portrait-motion-error-soft" }
};

export function getCounselorPortraitMotion(status: CounselorStatus): CounselorPortraitMotion {
  return portraitMotionByStatus[status];
}
