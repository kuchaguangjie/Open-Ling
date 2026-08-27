import { useEffect, useState } from "react";
import type {
  DailyUsageSummary,
  ProviderUsageSummary,
  UsageSummaryResult
} from "@shared/index";
import { useLingua } from "../../../localization/useLingua";
import { SettingSectionCard } from "./SettingsSystemPage";

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  providers: ProviderUsageSummary[];
}

export function UsageSettings() {
  const { l, locale } = useLingua();
  const [summary, setSummary] = useState<UsageSummaryResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    if (!window.lingDesktop?.usage) {
      setStatus("error");
      return;
    }
    window.lingDesktop.usage
      .getSummary()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setSummary(result.data);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const days = summary?.days ?? [];
  const todayKey = localDateKey(new Date());
  const today = days.find((day) => day.date === todayKey);
  const week = mergeDays(days);
  const hasWeekUsage = week.inputTokens + week.outputTokens > 0;

  return (
    <div className="system-simple-page">
      <header className="system-content-header">
        <div>
          <h1>{l("用量与费用", "Usage & fees")}</h1>
          <p>
            {l(
              "查看模型调用的 Token 消耗。Ling 本身免费，具体费用以模型服务商定价为准。",
              "Review token consumption across model calls. Ling itself is free; fees follow your model provider's pricing."
            )}
          </p>
        </div>
      </header>

      <SettingSectionCard title={l("Ling 不收取费用", "Ling charges no fees")}>
        <div className="usage-intro">
          <p>
            {l(
              "Ling 官方开源版本可以免费下载和使用，Ling 开发团队不会通过 App 向你收取咨询费、订阅费或使用费。",
              "The official open-source Ling can be downloaded and used for free. The Ling development team does not charge counseling, subscription, or usage fees through the app."
            )}
          </p>
          <p>
            {l(
              "使用中可能产生的费用，只来自你接入的模型服务商。Ling 生成回复、整理会谈材料和来信时需要调用模型服务，费用按该服务商自己的定价计算；接入本机模型时，不会产生服务商调用费用。",
              "Any cost comes only from the model provider you connect. When Ling generates replies, session materials, and letters, it calls the model service, and fees follow that provider's own pricing. A local model creates no provider charges."
            )}
          </p>
          <p>
            {l(
              "Ling 只在本机记录 Token 数量，不计算也不显示金额。你的实际费用、免费额度和优惠，请以模型服务商官网价格和账户账单为准。",
              "Ling records only token counts on this device and does not calculate or display currency amounts. For your actual charges, credits, and discounts, refer to the provider's official pricing and your account bill."
            )}
          </p>
        </div>
      </SettingSectionCard>

      <SettingSectionCard title={l("今天的用量", "Today's usage")}>
        {status === "loading" && <p className="usage-empty">{l("正在读取用量……", "Loading usage…")}</p>}
        {status === "error" && (
          <p className="usage-empty">{l("暂时无法读取用量记录，请稍后再看。", "Usage records could not be read right now. Please try again.")}</p>
        )}
        {status === "ready" && today && <UsageDay day={today} locale={locale} />}
        {status === "ready" && !today && (
          <p className="usage-empty">
            {l(
              "今天还没有记录到模型调用。开始咨询或测试连接后，这里会显示 Token 消耗。",
              "No model calls have been recorded today. Token usage appears here after counseling or a connection test."
            )}
          </p>
        )}
      </SettingSectionCard>

      <SettingSectionCard title={l("最近 7 天", "Last 7 days")}>
        {status === "loading" && <p className="usage-empty">{l("正在读取用量……", "Loading usage…")}</p>}
        {status === "error" && (
          <p className="usage-empty">{l("暂时无法读取用量记录，请稍后再看。", "Usage records could not be read right now. Please try again.")}</p>
        )}
        {status === "ready" && hasWeekUsage && (
          <UsageTotals label={l("7 天合计 Token", "Tokens over 7 days")} locale={locale} totals={week} />
        )}
        {status === "ready" && !hasWeekUsage && (
          <p className="usage-empty">{l("最近 7 天还没有模型调用记录。", "No model calls have been recorded in the last 7 days.")}</p>
        )}
      </SettingSectionCard>

      <p className="usage-note">
        {l(
          "用量包含咨询对话、会谈后整理、来信、标题和摘要等所有模型调用，也包括测试连接产生的少量消耗。Token 费用请以模型服务商官网定价为准。",
          "Usage includes every model call: counseling conversation, post-session work, letters, titles, and summaries, plus the small amount from connection tests. Token fees follow the provider's official pricing."
        )}
      </p>
    </div>
  );
}

function UsageDay({ day, locale }: { day: DailyUsageSummary; locale: string }) {
  return (
    <UsageTotals
      label={localizedWord(locale, "今日 Token", "Tokens today")}
      locale={locale}
      totals={{
        inputTokens: day.inputTokens,
        outputTokens: day.outputTokens,
        providers: day.providers
      }}
    />
  );
}

function UsageTotals({ label, totals, locale }: { label: string; totals: UsageTotals; locale: string }) {
  return (
    <div className="usage-totals">
      <div className="usage-grand-total">
        <strong>{formatTokens(totals.inputTokens + totals.outputTokens, locale)}</strong>
        <span>{label}</span>
      </div>
      <div className="usage-provider-list">
        {totals.providers.map((provider) => (
          <UsageProviderRow key={provider.providerName} locale={locale} provider={provider} />
        ))}
      </div>
    </div>
  );
}

function UsageProviderRow({ provider, locale }: { provider: ProviderUsageSummary; locale: string }) {
  const total = provider.inputTokens + provider.outputTokens;
  return (
    <div className="usage-provider-row">
      <div className="usage-provider-head">
        <span className="usage-provider-name">{providerLabel(provider.providerName, locale)}</span>
        {provider.connectionKind === "local" && (
          <span className="usage-local-note">{localizedWord(locale, "本机运行 · 无服务商费用", "Local model · no provider fees")}</span>
        )}
      </div>
      <div className="usage-token-cells">
        <span className="usage-token-cell">
          <small>{localizedWord(locale, "输入", "Input")}</small>
          {formatTokens(provider.inputTokens, locale)}
        </span>
        <span className="usage-token-cell">
          <small>{localizedWord(locale, "输出", "Output")}</small>
          {formatTokens(provider.outputTokens, locale)}
        </span>
        <span className="usage-token-cell">
          <small>{localizedWord(locale, "合计", "Total")}</small>
          {formatTokens(total, locale)}
        </span>
      </div>
      {provider.models.length > 0 && (
        <p className="usage-provider-models">
          {provider.models
            .map((model) => `${model.modelName} ${formatTokens(model.inputTokens + model.outputTokens, locale)}`)
            .join(locale === "en-US" ? " · " : "　·　")}
        </p>
      )}
    </div>
  );
}

function providerLabel(name: string, locale: string) {
  if (name === "local") return localizedWord(locale, "本地模型", "Local model");
  if (name === "custom") return localizedWord(locale, "自定义服务", "Custom service");
  return name;
}

function mergeDays(days: DailyUsageSummary[]): UsageTotals {
  const totals: UsageTotals = { inputTokens: 0, outputTokens: 0, providers: [] };
  for (const day of days) {
    totals.inputTokens += day.inputTokens;
    totals.outputTokens += day.outputTokens;
    for (const provider of day.providers) {
      const existing = totals.providers.find((item) => item.providerName === provider.providerName);
      if (!existing) {
        totals.providers.push({
          providerName: provider.providerName,
          connectionKind: provider.connectionKind,
          inputTokens: provider.inputTokens,
          outputTokens: provider.outputTokens,
          models: provider.models.map((model) => ({ ...model }))
        });
        continue;
      }
      existing.inputTokens += provider.inputTokens;
      existing.outputTokens += provider.outputTokens;
      for (const model of provider.models) {
        const existingModel = existing.models.find((item) => item.modelName === model.modelName);
        if (existingModel) {
          existingModel.inputTokens += model.inputTokens;
          existingModel.outputTokens += model.outputTokens;
        } else {
          existing.models.push({ ...model });
        }
      }
    }
  }
  return totals;
}

function formatTokens(value: number, locale: string) {
  return value.toLocaleString(locale === "en-US" ? "en-US" : "zh-CN");
}

function localizedWord(locale: string, zh: string, en: string) {
  return locale === "en-US" ? en : zh;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
