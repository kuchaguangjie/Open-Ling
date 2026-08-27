import { describe, expect, it } from "vitest";
import { CounselingRoomComposer } from "./composer/CounselingRoomComposer";
import { CounselingRoomMessageStream } from "./conversation/CounselingRoomMessageStream";
import { CounselingRoomHeader } from "./conversation/CounselingRoomHeader";
import { CounselingRoomStage } from "./stage/CounselingRoomStage";
import { SessionLetterReader } from "./overlays/session-letter/SessionLetterReader";
import { CounselingRoomTransitions } from "./transitions/CounselingRoomTransitions";

describe("consulting room module boundaries", () => {
  it("exposes independently owned room surfaces for parallel feature work", () => {
    expect(CounselingRoomHeader).toBeTypeOf("function");
    expect(CounselingRoomMessageStream).toBeTypeOf("function");
    expect(CounselingRoomComposer).toBeTypeOf("function");
    expect(CounselingRoomStage).toBeTypeOf("function");
    expect(CounselingRoomTransitions).toBeTypeOf("function");
    expect(SessionLetterReader).toBeTypeOf("function");
  });
});
