// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { KeyedExclusiveQueue, SessionRuntimeCoordinator, validateCounselingStreamTarget } from "./sessionRuntimeCoordinator";

describe("KeyedExclusiveQueue", () => {
  it("serializes same-key check-and-create operations without blocking other keys", async () => {
    const queue = new KeyedExclusiveQueue();
    const entered: string[] = [];
    let releaseFirst = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.run("chengling", async () => {
      entered.push("first");
      await firstGate;
      return 1;
    });
    const second = queue.run("chengling", async () => {
      entered.push("second");
      return 2;
    });
    const otherCounselor = queue.run("zhouzhou", async () => {
      entered.push("other");
      return 3;
    });

    await otherCounselor;
    expect(entered).toEqual(["first", "other"]);
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(entered).toEqual(["first", "other", "second"]);
  });

  it("releases the queue after a failed operation", async () => {
    const queue = new KeyedExclusiveQueue();
    await expect(queue.run("chengling", async () => {
      throw new Error("failed");
    })).rejects.toThrow("failed");
    await expect(queue.run("chengling", async () => "recovered")).resolves.toBe("recovered");
  });
});

describe("SessionRuntimeCoordinator", () => {
  it("allows at most one stream per session and one owner per request id", () => {
    const runtime = new SessionRuntimeCoordinator();
    expect(runtime.beginStream("session-1", "request-1", new AbortController())).toBe(true);
    expect(runtime.beginStream("session-1", "request-2", new AbortController())).toBe(false);
    expect(runtime.beginStream("session-2", "request-1", new AbortController())).toBe(false);
    expect(runtime.getActiveStream("session-1")).toEqual({ sessionId: "session-1", requestId: "request-1" });
  });

  it("blocks lifecycle mutations while a stream is active and releases only the matching token", () => {
    const runtime = new SessionRuntimeCoordinator();
    runtime.beginStream("session-1", "request-1", new AbortController());
    expect(runtime.beginMutation("session-1")).toBe(false);

    runtime.finishStream("session-1", "late-request");
    expect(runtime.getActiveStream("session-1")).not.toBeNull();
    runtime.finishStream("session-1", "request-1");
    expect(runtime.beginMutation("session-1")).toBe(true);
    expect(runtime.beginStream("session-1", "request-2", new AbortController())).toBe(false);
    runtime.finishMutation("session-1");
    expect(runtime.beginStream("session-1", "request-2", new AbortController())).toBe(true);
  });

  it("aborts the exact request without releasing its lock before finally", () => {
    const runtime = new SessionRuntimeCoordinator();
    const controller = new AbortController();
    const abort = vi.spyOn(controller, "abort");
    runtime.beginStream("session-1", "request-1", controller);

    expect(runtime.abort("request-1")).toBe(true);
    expect(abort).toHaveBeenCalledTimes(1);
    expect(runtime.getActiveStream("session-1")).not.toBeNull();
    runtime.finishStream("session-1", "request-1");
    expect(runtime.getActiveStream("session-1")).toBeNull();
  });
});

describe("validateCounselingStreamTarget", () => {
  const request = { counselorId: "chengling", teamId: "one-way-mirror" };

  it.each(["draft", "ended"] as const)("rejects %s sessions before any message is written", (status) => {
    expect(validateCounselingStreamTarget({ status, counselorId: "chengling", teamId: "one-way-mirror" }, request)).toBe(
      "这场咨询当前不能发送消息。若已结束，请先选择“继续咨询”。"
    );
  });

  it("rejects counselor and team mismatches and accepts the frozen session identity", () => {
    expect(
      validateCounselingStreamTarget(
        { status: "active", counselorId: "zhouzhou", teamId: "one-way-mirror" },
        request
      )
    ).toBe("当前咨询师与这场会谈的记录不一致。请返回等待室并重新进入；不要继续发送。");
    expect(
      validateCounselingStreamTarget(
        { status: "active", counselorId: "chengling", teamId: "supervision" },
        request
      )
    ).toBe("当前会谈支持配置与记录不一致。请返回等待室并重新进入；不要继续发送。");
    expect(
      validateCounselingStreamTarget(
        { status: "active", counselorId: "chengling", teamId: "one-way-mirror" },
        request
      )
    ).toBeNull();
  });
});
