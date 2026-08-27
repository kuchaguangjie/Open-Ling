// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  MODEL_CAPABILITY_TABLE,
  hostIs,
  matchModelCapability,
  resolveModelRuntimeContract,
  type CapabilityLookup
} from "./modelCapabilityTable";

const CASES: Array<{ name: string; api: CapabilityLookup; expectMatched: boolean; expectId?: string }> = [
  { name: "glm-6 @ z.ai", api: { apiBaseUrl: "https://api.z.ai/api/paas/v4", modelName: "glm-6", remoteProvider: "glm" }, expectMatched: true, expectId: "glm-5.2+" },
  { name: "glm-6 @ 自建网关", api: { apiBaseUrl: "https://gateway.corp.internal/v1", modelName: "glm-6", remoteProvider: "glm" }, expectMatched: true, expectId: "glm-5.2+" },
  { name: "kimi-k2.6 @ moonshot.ai", api: { apiBaseUrl: "https://api.moonshot.ai/v1", modelName: "kimi-k2.6", remoteProvider: "kimi" }, expectMatched: true, expectId: "kimi-k2.5+" },
  { name: "qwen3.5-plus @ dashscope-intl", api: { apiBaseUrl: "https://dashscope-intl.aliyuncs.com/v1", modelName: "qwen3.5-plus", remoteProvider: "qwen" }, expectMatched: true, expectId: "qwen3" },
  { name: "deepseek-v4-pro @ 自建代理", api: { apiBaseUrl: "https://proxy.corp.internal/v1", modelName: "deepseek-v4-pro", remoteProvider: "deepseek" }, expectMatched: true, expectId: "deepseek-reasoner" },
  { name: "glm-5.3（新小版本）", api: { apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4", modelName: "glm-5.3", remoteProvider: "glm" }, expectMatched: true, expectId: "glm-5.2+" },
  { name: "kimi-k2.7（新小版本）", api: { apiBaseUrl: "https://api.moonshot.cn/v1", modelName: "kimi-k2.7", remoteProvider: "kimi" }, expectMatched: true, expectId: "kimi-k2.5+" },
  { name: "未知模型", api: { apiBaseUrl: "https://api.example.com/v1", modelName: "some-unknown-v9", remoteProvider: "custom" }, expectMatched: false }
];

describe("模型能力表 · 单一真相源", () => {
  it.each(CASES)("$name：UI 有档位 ⇔ 信任主机才下发私有参数", ({ api, expectMatched, expectId }) => {
    const entry = matchModelCapability(api);
    expect(Boolean(entry)).toBe(expectMatched);
    expect(entry?.id).toBe(expectId);

    const uiActive = (entry?.reasoningOptions.length ?? 0) > 0;
    const contract = resolveModelRuntimeContract({ ...api, reasoningEffort: "high" }, "dialogue", { warn: () => {} });
    const wireActive = Object.keys(contract.wireParams).length > 0;
    expect(Boolean(uiActive && contract.vendorParamsTrusted)).toBe(wireActive);
  });

  it.each(CASES.filter((item) => item.expectMatched))("$name：下发档位不越出 UI 允许集合", ({ api }) => {
    const entry = matchModelCapability(api)!;
    for (const requested of ["none", "low", "medium", "high", "max", undefined] as const) {
      const contract = resolveModelRuntimeContract({ ...api, reasoningEffort: requested }, "dialogue", { warn: () => {} });
      expect(entry.reasoningOptions).toContain(contract.reasoningEffort);
    }
  });

  it("声明不接受采样的模型不得盲传 temperature", () => {
    const api = { apiBaseUrl: "https://api.openai.com/v1", modelName: "gpt-5-pro" };
    const entry = matchModelCapability(api)!;
    expect(entry.acceptsSampling).toBe(false);
    expect(resolveModelRuntimeContract({ ...api, reasoningEffort: "high" }, "dialogue").sampling).toBeNull();
  });

  it("更窄的条目排在更宽的前面，否则会被遮蔽", () => {
    const narrow = MODEL_CAPABILITY_TABLE.findIndex((entry) => entry.id === "openai-gpt5-pro");
    const wide = MODEL_CAPABILITY_TABLE.findIndex((entry) => entry.id === "openai-reasoning");
    expect(narrow).toBeLessThan(wide);
    expect(matchModelCapability({ apiBaseUrl: "https://api.openai.com/v1", modelName: "gpt-5-pro" })!.id)
      .toBe("openai-gpt5-pro");
  });

  it("eval 采样档必须是确定性的，否则方差归因不到模型", () => {
    const contract = resolveModelRuntimeContract(
      {
        apiBaseUrl: "https://api.deepseek.com/v1",
        modelName: "deepseek-v4-pro",
        remoteProvider: "deepseek",
        reasoningEffort: "high"
      },
      "eval"
    );
    expect(contract.sampling?.temperature).toBe(0);
    expect(contract.sampling?.seed).toBeDefined();
  });

  it("不把任一厂商写成产品默认：未命中不下发 sampling", () => {
    const contract = resolveModelRuntimeContract(
      { apiBaseUrl: "https://gateway.example/v1", modelName: "acme-chat", remoteProvider: "custom" },
      "dialogue",
      { warn: () => {} }
    );
    expect(contract.matched).toBe(false);
    expect(contract.sampling).toBeNull();
    expect(contract.compilerId).toBe("chat-system");
  });

  it("未命中时留下一条可 grep 的告警，而不是静默降级", () => {
    const lines: string[] = [];
    resolveModelRuntimeContract(
      {
        apiBaseUrl: "https://api.example.com/v1",
        modelName: `unknown-${Date.now()}`,
        remoteProvider: "custom",
        reasoningEffort: "high"
      },
      "dialogue",
      { warn: (message) => lines.push(message) }
    );
    expect(lines.join()).toMatch(/未识别的模型/);
  });

  it("LING_CHAT_SCENE_LAST only splits matched chat-system models", () => {
    const previous = process.env.LING_CHAT_SCENE_LAST;
    process.env.LING_CHAT_SCENE_LAST = "1";
    try {
      const grok = resolveModelRuntimeContract(
        { apiBaseUrl: "https://api.x.ai/v1", modelName: "grok-4.5" },
        "dialogue",
        { warn: () => {} }
      );
      expect(grok.matched).toBe(true);
      expect(grok.compilerId).toBe("chat-split-system");
      const unmatched = resolveModelRuntimeContract(
        { apiBaseUrl: "https://api.example.com/v1", modelName: "unknown-v9", remoteProvider: "custom" },
        "dialogue",
        { warn: () => {} }
      );
      expect(unmatched.matched).toBe(false);
      expect(unmatched.compilerId).toBe("chat-system");
    } finally {
      if (previous === undefined) delete process.env.LING_CHAT_SCENE_LAST;
      else process.env.LING_CHAT_SCENE_LAST = previous;
    }
  });

  it("matches official DeepSeek names and date snapshots", () => {
    expect(matchModelCapability({ apiBaseUrl: "https://api.deepseek.com/v1", modelName: "deepseek-reasoner" })?.id).toBe("deepseek-reasoner");
    expect(resolveModelRuntimeContract({ apiBaseUrl: "https://api.deepseek.com/v1", modelName: "deepseek-reasoner" }).compilerId).toBe("reasoner-user-prefix");
    expect(matchModelCapability({ apiBaseUrl: "https://api.deepseek.com/v1", modelName: "deepseek-chat" })?.id).toBe("deepseek-chat");
    expect(matchModelCapability({ apiBaseUrl: "https://api.deepseek.com/v1", modelName: "deepseek-v4-pro-0715" })?.id).toBe("deepseek-reasoner");
    const wired = resolveModelRuntimeContract(
      { apiBaseUrl: "https://api.deepseek.com/v1", modelName: "deepseek-reasoner", reasoningEffort: "high" },
      "dialogue"
    );
    expect(wired.vendorParamsTrusted).toBe(true);
    expect(wired.wireParams).toMatchObject({ thinking: { type: "enabled" }, reasoning_effort: "high" });
  });

  it("accepts hyphenated Qwen/Kimi ids and OpenRouter prefixes", () => {
    expect(matchModelCapability({ apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", modelName: "qwen3-235b-a22b" })?.id).toBe("qwen3");
    expect(matchModelCapability({ apiBaseUrl: "https://api.moonshot.cn/v1", modelName: "kimi-k2-0905-preview" })?.id).toBe("kimi-k2.5+");
    expect(matchModelCapability({ apiBaseUrl: "https://openrouter.ai/api/v1", modelName: "z-ai/glm-5.2" })?.id).toBe("glm-5.2+");
    expect(matchModelCapability({ apiBaseUrl: "https://openrouter.ai/api/v1", modelName: "x-ai/grok-4.5" })?.id).toBe("xai-grok");
  });

  it("does not treat openai.com as a hostname substring", () => {
    expect(hostIs("api.openai.com", ["openai.com"])).toBe(true);
    expect(hostIs("api.openai.com.cn-gw.example.io", ["openai.com"])).toBe(false);
    const spoof = matchModelCapability({ apiBaseUrl: "https://api.openai.com.cn-gw.example.io/v1", modelName: "gpt-5" });
    expect(spoof).toBeUndefined();
    expect(matchModelCapability({ apiBaseUrl: "https://my-res.openai.azure.com/openai/v1", modelName: "gpt-5" })?.id).toBe("openai-reasoning");
  });

  it("does not treat a distill checkpoint as a DeepSeek reasoner", () => {
    const api = { apiBaseUrl: "https://api.together.xyz/v1", modelName: "deepseek-r1-distill-qwen-7b" };
    expect(matchModelCapability(api)).toBeUndefined();
    const contract = resolveModelRuntimeContract(api, "dialogue", { warn: () => {} });
    expect(contract.matched).toBe(false);
    expect(contract.vendorParamsTrusted).toBe(false);
    expect(contract.wireParams).toEqual({});
  });

  it("does not treat gpt-5 on an untrusted host as OpenAI reasoning", () => {
    const api = { apiBaseUrl: "https://api.together.xyz/v1", modelName: "gpt-5" };
    expect(matchModelCapability(api)).toBeUndefined();
    const contract = resolveModelRuntimeContract(api, "dialogue", { warn: () => {} });
    expect(contract.matched).toBe(false);
    expect(contract.wireParams).toEqual({});
  });

  it("withholds vendor-private wire on an untrusted host even when the compiler follows the model name", () => {
    const lines: string[] = [];
    const api = { apiBaseUrl: "https://api.together.xyz/v1", modelName: "deepseek-v4-pro" };
    expect(matchModelCapability(api)?.id).toBe("deepseek-reasoner");
    const contract = resolveModelRuntimeContract({ ...api, reasoningEffort: "high" }, "dialogue", {
      warn: (message) => lines.push(message)
    });
    expect(contract.matched).toBe(true);
    expect(contract.compilerId).toBe("reasoner-user-prefix");
    expect(contract.vendorParamsTrusted).toBe(false);
    expect(contract.wireParams).toEqual({});
    expect(lines.join()).toMatch(/厂商私有参数已扣留/);
  });

  it("does not warn when withheld wire would have been empty", () => {
    const lines: string[] = [];
    const contract = resolveModelRuntimeContract(
      { apiBaseUrl: "https://api.example.test/v1", modelName: "deepseek-chat" },
      "dialogue",
      { warn: (message) => lines.push(message) }
    );
    expect(contract.matched).toBe(true);
    expect(contract.vendorParamsTrusted).toBe(false);
    expect(contract.wireParams).toEqual({});
    expect(lines.join()).not.toMatch(/厂商私有参数已扣留/);
  });
});
