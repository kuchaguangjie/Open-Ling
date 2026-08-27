import type {
  DailyUsageSummary,
  ModelUsageRecord,
  ProviderUsageSummary
} from "@shared/index";
import type { LingDatabase } from "../db.js";

export interface UsageRepository {
  record: (entry: ModelUsageRecord) => Promise<void>;
  listRecentDays: (days: number) => Promise<DailyUsageSummary[]>;
}

interface UsageRow {
  id: string;
  provider_name: string;
  model_name: string;
  connection_kind: ModelUsageRecord["connectionKind"];
  scope: ModelUsageRecord["scope"];
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

export function createUsageRepository(db: LingDatabase): UsageRepository {
  return {
    async record(entry) {
      db.prepare<[
        string,
        string,
        string,
        string,
        string,
        number,
        number,
        string
      ]>(
        `INSERT INTO model_usage (
           id, provider_name, model_name, connection_kind, scope,
           input_tokens, output_tokens, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.id,
        entry.providerName,
        entry.modelName,
        entry.connectionKind,
        entry.scope,
        entry.inputTokens,
        entry.outputTokens,
        entry.createdAt
      );
    },
    async listRecentDays(days) {
      const today = new Date();
      const sinceDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
      const sinceInstant = sinceDate.toISOString();
      const rows = db
        .prepare<[string], UsageRow>(
          `SELECT id, provider_name, model_name, connection_kind, scope,
                  input_tokens, output_tokens, created_at
           FROM model_usage
           WHERE created_at >= ?
           ORDER BY created_at ASC`
        )
        .all(sinceInstant);

      const byDay = new Map<string, Map<string, ProviderUsageSummary>>();
      const dayInput = new Map<string, number>();
      const dayOutput = new Map<string, number>();

      for (const row of rows) {
        const date = localDateKey(new Date(row.created_at));
        const inputTokens = row.input_tokens;
        const outputTokens = row.output_tokens;
        dayInput.set(date, (dayInput.get(date) ?? 0) + inputTokens);
        dayOutput.set(date, (dayOutput.get(date) ?? 0) + outputTokens);

        const providers = byDay.get(date) ?? new Map<string, ProviderUsageSummary>();
        byDay.set(date, providers);

        const provider = providers.get(row.provider_name) ?? {
          providerName: row.provider_name,
          connectionKind: row.connection_kind,
          inputTokens: 0,
          outputTokens: 0,
          models: []
        };
        providers.set(row.provider_name, provider);
        provider.inputTokens += inputTokens;
        provider.outputTokens += outputTokens;

        const model = provider.models.find((item) => item.modelName === row.model_name);
        if (model) {
          model.inputTokens += inputTokens;
          model.outputTokens += outputTokens;
        } else {
          provider.models.push({
            modelName: row.model_name,
            inputTokens,
            outputTokens
          });
        }
      }

      return Array.from(byDay.entries())
        .map(([date, providers]) => ({
          date,
          inputTokens: dayInput.get(date) ?? 0,
          outputTokens: dayOutput.get(date) ?? 0,
          providers: Array.from(providers.values())
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  };
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
