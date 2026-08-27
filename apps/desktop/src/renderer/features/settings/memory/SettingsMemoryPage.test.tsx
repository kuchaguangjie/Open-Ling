import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CounselingSession, SessionLetter } from "@shared/index";
import { resetSettingsStore, useSettingsStore } from "../../../stores/settingsStore";
import { useSessionStore } from "../../../stores/sessionStore";
import { SettingsMemoryPage } from "./SettingsMemoryPage";

const readyLetter: SessionLetter = {
  id: "session-letter-real-1",
  sessionId: "session-real-1",
  counselorId: "chengling",
  modelName: "deepseek-v4-pro",
  status: "ready",
  letterMd: "亲爱的你：\n\n我记得你在会谈里提到边界感。那不是一句轻飘飘的话，而是一种很真实的尝试。\n\n愿你先允许自己慢一点。",
  createdAt: "2026-07-04T09:20:00.000Z",
  updatedAt: "2026-07-04T09:20:00.000Z"
};

const failedLetter: SessionLetter = {
  id: "session-letter-real-2",
  sessionId: "session-real-2",
  counselorId: "zhouzhou",
  modelName: "deepseek-v4-pro",
  status: "failed",
  letterMd: "",
  errorMessage: "模型暂时不可用",
  createdAt: "2026-07-05T09:20:00.000Z",
  updatedAt: "2026-07-05T09:20:00.000Z"
};

const sessions: CounselingSession[] = [
  {
    id: "session-real-1",
    title: "真实会谈标题",
    counselorId: "chengling",
    roomThemeId: "warm-study",
    teamId: "one-way-mirror",
    modelName: "deepseek-v4-pro",
    status: "ended",
    createdAt: "2026-07-04T08:00:00.000Z",
    updatedAt: "2026-07-04T09:00:00.000Z",
    endedAt: "2026-07-04T09:00:00.000Z"
  },
  {
    id: "session-real-2",
    title: "失败来信会谈",
    counselorId: "zhouzhou",
    roomThemeId: "warm-study",
    teamId: "one-way-mirror",
    modelName: "deepseek-v4-pro",
    status: "ended",
    createdAt: "2026-07-05T08:00:00.000Z",
    updatedAt: "2026-07-05T09:00:00.000Z",
    endedAt: "2026-07-05T09:00:00.000Z"
  }
];

describe("SettingsMemoryPage letter archive", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetSettingsStore();
    useSessionStore.setState({
      activeSessionId: "",
      sessions: [],
      sessionLettersBySessionId: {}
    });
  });

  it("loads counselor letters from the desktop bridge instead of mock data", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({ ok: true as const, data: sessions }))
      },
      sessionLetters: {
        list: vi.fn(async () => ({ ok: true as const, data: [readyLetter] }))
      }
    });

    render(<SettingsMemoryPage />);

    expect(screen.getByText("正在读取本地来信...")).toBeInTheDocument();
    expect((await screen.findAllByText("真实会谈标题")).length).toBeGreaterThan(0);
    expect(screen.getByText("咨询师的信")).toBeInTheDocument();
    expect(screen.getAllByText("2026年7月4日").length).toBeGreaterThan(0);
    expect(screen.getByText("我记得你在会谈里提到边界感。那不是一句轻飘飘的话，而是一种很真实的尝试。")).toBeInTheDocument();
    expect(screen.queryByText(/亲爱的你：/)).not.toBeInTheDocument();
    expect(screen.queryByText("关于边界感的会谈")).not.toBeInTheDocument();
  });

  it("does not display a stale letter after its session resumes", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({
          ok: true as const,
          data: [{ ...sessions[0], status: "active" as const, endedAt: undefined }]
        }))
      },
      sessionLetters: {
        list: vi.fn(async () => ({ ok: true as const, data: [readyLetter] }))
      }
    });

    render(<SettingsMemoryPage />);

    expect(await screen.findByText("还没有来信")).toBeInTheDocument();
    expect(screen.queryByText("真实会谈标题")).not.toBeInTheDocument();
  });

  it("uses the current profile display name when rendering historical generic letter salutations", async () => {
    useSettingsStore.setState({
      profile: {
        displayName: "小满",
        background: ""
      }
    });
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({ ok: true as const, data: sessions }))
      },
      sessionLetters: {
        list: vi.fn(async () => ({ ok: true as const, data: [readyLetter] }))
      }
    });

    render(<SettingsMemoryPage />);

    expect((await screen.findAllByText("小满：")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/亲爱的你：/)).not.toBeInTheDocument();
    expect(screen.getAllByText("小满：").some((node) => node.classList.contains("letter-salutation"))).toBe(true);
  });

  it("shows an empty state when there are no letters", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({ ok: true as const, data: [] }))
      },
      sessionLetters: {
        list: vi.fn(async () => ({ ok: true as const, data: [] }))
      }
    });

    render(<SettingsMemoryPage />);

    expect(await screen.findByText("还没有来信")).toBeInTheDocument();
    expect(screen.getByText("结束一次会谈后，咨询师写给你的信会出现在这里。")).toBeInTheDocument();
  });

  it("shows refresh feedback and reloads letters", async () => {
    let resolveRefresh: ((value: { ok: true; data: SessionLetter[] }) => void) | undefined;
    const listLetters = vi
      .fn()
      .mockResolvedValueOnce({ ok: true as const, data: [readyLetter] })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          })
      );

    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({ ok: true as const, data: sessions }))
      },
      sessionLetters: {
        list: listLetters
      }
    });

    render(<SettingsMemoryPage />);

    await screen.findAllByText("真实会谈标题");
    const refreshButton = screen.getByRole("button", { name: /刷新/ });

    fireEvent.click(refreshButton);

    expect(screen.getByRole("button", { name: /刷新中/ })).toBeDisabled();

    resolveRefresh?.({ ok: true, data: [failedLetter] });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /刷新/ })).not.toBeDisabled();
    });
    expect(screen.getAllByText("失败来信会谈").length).toBeGreaterThan(0);
  });

  it("uses session store letters as the web preview fallback", async () => {
    vi.stubGlobal("lingDesktop", undefined);
    useSessionStore.setState({
      sessions: [
        {
          id: "web-preview-session",
          title: "网页预览结束会谈",
          time: "刚刚",
          preview: "本次咨询已结束。",
          counselorId: "chengling",
          roomThemeId: "warm-study",
          teamId: "one-way-mirror",
          modelName: "deepseek-v4-pro",
          status: "ended",
          endedAt: "2026-07-06T09:00:00.000Z",
          messages: []
        }
      ],
      sessionLettersBySessionId: {
        "web-preview-session": {
          id: "session-letter-web-preview-session",
          sessionId: "web-preview-session",
          counselorId: "chengling",
          modelName: "deepseek-v4-pro",
          status: "pending",
          letterMd: "",
          createdAt: "2026-07-06T09:01:00.000Z",
          updatedAt: "2026-07-06T09:01:00.000Z"
        }
      }
    });

    render(<SettingsMemoryPage />);

    expect((await screen.findAllByText("网页预览结束会谈")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("正在写信").length).toBeGreaterThan(0);
    expect(screen.queryByText("关于边界感的会谈")).not.toBeInTheDocument();
  });

  it("filters letters by counselor and search text", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({ ok: true as const, data: sessions }))
      },
      sessionLetters: {
        list: vi.fn(async () => ({ ok: true as const, data: [readyLetter, failedLetter] }))
      }
    });

    render(<SettingsMemoryPage />);
    expect((await screen.findAllByText("真实会谈标题")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("失败来信会谈").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /周舟/ })[0]);
    expect(screen.queryByText("真实会谈标题")).not.toBeInTheDocument();
    expect(screen.getAllByText("失败来信会谈").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /全部咨询师/ }));
    expect(screen.getAllByText("真实会谈标题").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("搜索来信、会谈或咨询师"), { target: { value: "失败" } });
    expect(screen.queryByText("真实会谈标题")).not.toBeInTheDocument();
    expect(screen.getAllByText("失败来信会谈").length).toBeGreaterThan(0);
  });

  it("opens and closes the full letter reader", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({ ok: true as const, data: sessions }))
      },
      sessionLetters: {
        list: vi.fn(async () => ({ ok: true as const, data: [readyLetter] }))
      }
    });

    render(<SettingsMemoryPage />);
    await screen.findAllByText("真实会谈标题");

    fireEvent.click(screen.getByRole("button", { name: "打开完整信件" }));
    const dialog = screen.getByRole("dialog", { name: "完整来信" });
    expect(within(dialog).getByRole("heading", { name: "真实会谈标题" })).toBeInTheDocument();
    expect(within(dialog).getByText("程灵")).toBeInTheDocument();
    expect(within(dialog).getByText("2026年7月4日")).toBeInTheDocument();
    expect(within(dialog).getByText("愿你先允许自己慢一点。")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "关闭来信" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "完整来信" })).not.toBeInTheDocument();
    });
  });

  it("opens the full letter reader by double-clicking a ready letter", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({ ok: true as const, data: sessions }))
      },
      sessionLetters: {
        list: vi.fn(async () => ({ ok: true as const, data: [readyLetter] }))
      }
    });

    render(<SettingsMemoryPage />);
    await screen.findAllByText("真实会谈标题");

    fireEvent.doubleClick(screen.getByRole("button", { name: /真实会谈标题/ }));

    const dialog = screen.getByRole("dialog", { name: "完整来信" });
    expect(within(dialog).getByRole("heading", { name: "真实会谈标题" })).toBeInTheDocument();
  });

  it("can request regeneration for a failed letter", async () => {
    let letters = [failedLetter];
    const listLetters = vi.fn(async () => ({ ok: true as const, data: letters }));
    const regenerate = vi.fn(async () => {
      letters = [{ ...failedLetter, status: "pending" as const, errorMessage: undefined }];
      return { ok: true as const, data: letters[0] };
    });

    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({ ok: true as const, data: sessions }))
      },
      sessionLetters: {
        list: listLetters,
        regenerate
      }
    });

    render(<SettingsMemoryPage />);
    await screen.findAllByText("失败来信会谈");

    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));

    expect(regenerate).toHaveBeenCalledWith("session-real-2");
    await waitFor(() => {
      expect(screen.getAllByText("正在写信").length).toBeGreaterThan(0);
    });
  });
});
