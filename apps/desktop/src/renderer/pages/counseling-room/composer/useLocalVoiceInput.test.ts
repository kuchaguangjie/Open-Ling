import { describe, expect, it } from "vitest";
import { joinDraftAndSpeech, joinSpeechSegments } from "./useLocalVoiceInput";

describe("local voice draft composition", () => {
  it("preserves an existing Chinese draft without inserting stray spaces", () => {
    expect(joinDraftAndSpeech("我最近有点难受，", "尤其是晚上")).toBe("我最近有点难受，尤其是晚上");
  });

  it("adds a separator for adjacent English words", () => {
    expect(joinDraftAndSpeech("I feel", "a little better")).toBe("I feel a little better");
    expect(joinSpeechSegments("it feels", "different today")).toBe("it feels different today");
  });

  it("does not duplicate whitespace already present in the draft", () => {
    expect(joinDraftAndSpeech("想补充一件事：\n", "昨天我没有睡好")).toBe("想补充一件事：\n昨天我没有睡好");
  });
});
