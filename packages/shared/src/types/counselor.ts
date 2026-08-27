export type CounselorApproach =
  | "emotion-dynamic"
  | "reality-structure"
  | "eastern-contemplative"
  | "integrative"
  | "emotion-focused"
  | "mindfulness-existential";

export interface Counselor {
  id: string;
  name: string;
  approach: CounselorApproach;
  title: string;
  description: string;
  strengths: string[];
}
