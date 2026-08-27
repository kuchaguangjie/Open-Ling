// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { runPostSessionAgentPipeline } from "./postSessionAgentPipeline";

describe("post-session agent pipeline", () => {
  it("runs conceptualization, Li Yanyun supervision, and memo in strict order", async () => {
    const events: string[] = [];
    const result = await runPostSessionAgentPipeline({
      shouldCreateLongTermConceptualization: true,
      currentLongTermConceptualization: null,
      onPhase: (phase) => { events.push(`phase:${phase}`); },
      createSessionConceptualization: async () => {
        events.push("run:session");
        return "session-formulation";
      },
      createLongTermConceptualization: async (sessionConceptualization) => {
        events.push(`run:long-term:${sessionConceptualization}`);
        return "long-term-formulation";
      },
      createSupervision: async ({ sessionConceptualization, longTermConceptualization }) => {
        events.push(`run:supervision:${sessionConceptualization}:${longTermConceptualization}`);
        return "li-yanyun-supervision";
      },
      createConsultationMemo: async ({ supervision }) => {
        events.push(`run:memo:${supervision}`);
        return "consultation-memo";
      }
    });

    expect(events).toEqual([
      "phase:session-conceptualization",
      "run:session",
      "phase:long-term-conceptualization",
      "run:long-term:session-formulation",
      "phase:supervision",
      "run:supervision:session-formulation:long-term-formulation",
      "phase:consultation-memo",
      "run:memo:li-yanyun-supervision"
    ]);
    expect(result).toEqual({
      sessionConceptualization: "session-formulation",
      longTermConceptualization: "long-term-formulation",
      supervision: "li-yanyun-supervision",
      consultationMemo: "consultation-memo"
    });
  });

  it("reuses the current long-term formulation when a new one is not due", async () => {
    const createLongTerm = vi.fn(async () => "unexpected");
    const result = await runPostSessionAgentPipeline({
      shouldCreateLongTermConceptualization: false,
      currentLongTermConceptualization: "existing-long-term",
      createSessionConceptualization: async () => "session-formulation",
      createLongTermConceptualization: createLongTerm,
      createSupervision: async ({ longTermConceptualization }) => `supervised:${longTermConceptualization}`,
      createConsultationMemo: async ({ supervision }) => `memo:${supervision}`
    });

    expect(createLongTerm).not.toHaveBeenCalled();
    expect(result.longTermConceptualization).toBe("existing-long-term");
    expect(result.consultationMemo).toBe("memo:supervised:existing-long-term");
  });

  it("stops immediately when a stage fails", async () => {
    const createMemo = vi.fn(async () => "memo");

    await expect(runPostSessionAgentPipeline({
      shouldCreateLongTermConceptualization: false,
      currentLongTermConceptualization: null,
      createSessionConceptualization: async () => "session-formulation",
      createLongTermConceptualization: async () => "long-term",
      createSupervision: async () => { throw new Error("supervision unavailable"); },
      createConsultationMemo: createMemo
    })).rejects.toThrow("supervision unavailable");
    expect(createMemo).not.toHaveBeenCalled();
  });
});
