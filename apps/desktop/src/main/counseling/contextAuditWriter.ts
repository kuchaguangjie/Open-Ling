import { app } from "electron";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertContextPlanAuditIsSanitized,
  type ContextPlanAudit
} from "../../../../../packages/core/src/counseling/conversation/contextBudgetPlanner.js";

export async function writeContextPlanAudit(audit: ContextPlanAudit) {
  assertContextPlanAuditIsSanitized(audit);
  const dir = resolve(app.getPath("userData"), "logs", "context-audits");
  await mkdir(dir, { recursive: true });
  const fileName = `${safeFilePart(audit.createdAt)}-${safeFilePart(audit.source)}-${safeFilePart(audit.requestId)}.json`;
  await writeFile(resolve(dir, fileName), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await retainRecentAuditFiles(dir);
}

const MAX_AUDIT_FILES = 200;

async function retainRecentAuditFiles(dir: string) {
  const files = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();
  const removable = files.slice(0, Math.max(0, files.length - MAX_AUDIT_FILES));
  await Promise.all(removable.map((name) => rm(resolve(dir, name), { force: true })));
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}
