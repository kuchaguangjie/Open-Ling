export type DialogueFlow =
  | "firstVisit"
  | "returning"
  | "tour"
  | "counselors"
  | "booking"
  | "browse"
  | "consentIntro"
  | "handoff"
  | "smallTalk";
export type GardenWeather = "sunny" | "rainy";

export interface DialogueOption {
  label: string;
  onSelect: () => void;
}
