import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  counselorPackageRegistry,
  requireCounselorPackage,
  type SupportedLocale
} from "../../../shared/src/index.js";

const MAX_PROMPT_RESOURCE_BYTES = 1_048_576;

const supervisorCoreFiles: Record<string, string> = {
  "li-yanyun": "li-yanyun.md"
};

export type CounselorTaskPromptName =
  | "session-conceptualization"
  | "long-term-conceptualization"
  | "session-letter"
  | "post-session-supervision"
  | "next-session-memo";

export type PolicyPromptName = "counseling-ethics" | "realtime-safety";

const teamPrompts: Record<string, string> = {
  "one-way-mirror": "",
  supervision: "",
  integration: ""
};

const promptCache = new Map<string, string>();
const promptModuleDir = dirname(fileURLToPath(import.meta.url));

export function getCounselorPrompt(counselorId: string, locale: SupportedLocale = "zh-CN") {
  return getCounselorCorePrompt(counselorId, locale);
}

export function getCounselorCorePrompt(counselorId: string, locale: SupportedLocale = "zh-CN") {
  const counselorPackage = requireCounselorPackage(counselorId);
  return readPromptResource(counselorId, requireLocalizedResource(counselorPackage.prompts.counselorCore, locale));
}

export function getCounselorVoicePrompt(counselorId: string, locale: SupportedLocale = "zh-CN") {
  const counselorPackage = requireCounselorPackage(counselorId);
  const resource = counselorPackage.prompts.counselorVoice?.[locale];
  return resource ? readPromptResource(counselorId, resource) : "";
}

export function getSharedCounselingValuesPrompt(locale: SupportedLocale = "zh-CN") {
  return readPromptMarkdown("shared", "counseling-values.md", locale);
}

export function getSupervisorCorePrompt(supervisorId: string, locale: SupportedLocale = "zh-CN") {
  const promptFile = supervisorCoreFiles[supervisorId] ?? supervisorCoreFiles["li-yanyun"];
  return readPromptMarkdown("supervisor-cores", promptFile, locale);
}

export function getTaskPrompt(task: CounselorTaskPromptName, locale: SupportedLocale = "zh-CN") {
  return readPromptMarkdown("tasks", `${task}.md`, locale);
}

export function getCounselingDialogueScenePrompt(counselorId: string, locale: SupportedLocale = "zh-CN") {
  const counselorPackage = requireCounselorPackage(counselorId);
  return readPromptResource(counselorId, requireLocalizedResource(counselorPackage.prompts.counselingDialogue, locale));
}

export function getPolicyPrompt(policy: PolicyPromptName, locale: SupportedLocale = "zh-CN") {
  return readPromptMarkdown("policies", `${policy}.md`, locale);
}

export function getCounselorAdditionalPolicyPrompts(counselorId: string) {
  const counselorPackage = requireCounselorPackage(counselorId);
  return counselorPackage.safety.additionalPolicies.map((resourceUri) =>
    readPromptResource(counselorId, resourceUri)
  );
}

export function getTeamPrompt(teamId: string) {
  return teamPrompts[teamId] ?? "";
}

function readPromptMarkdown(folderName: string, fileName: string, locale: SupportedLocale) {
  const cacheKey = `${locale}/${folderName}/${fileName}`;
  const cached = promptCache.get(cacheKey);
  if (cached !== undefined) return cached;

  for (const filePath of getPromptCandidates(folderName, fileName, locale)) {
    if (!existsSync(filePath)) continue;
    const prompt = readFileSync(filePath, "utf8").trim();
    promptCache.set(cacheKey, prompt);
    return prompt;
  }

  throw new Error(`未找到咨询师提示词文件: ${fileName}`);
}

function readPromptResource(counselorId: string, resourceUri: string) {
  const registration = counselorPackageRegistry.require(counselorId);
  const cacheKey = `${counselorId}@${registration.manifest.version}:${resourceUri}`;
  const cached = promptCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const prefix = "builtin://prompts/";
  const packagePrefix = "package://";
  let candidates: string[];
  if (resourceUri.startsWith(prefix)) {
    if (registration.source.kind !== "builtin") {
      throw new Error(`第三方咨询师包不能引用内置提示词: ${resourceUri}`);
    }
    const relativePath = validateRelativeResourcePath(resourceUri.slice(prefix.length), resourceUri);
    candidates = [
      resolve(promptModuleDir, relativePath),
      resolve(process.cwd(), "packages/core/src/prompts", relativePath),
      resolve(process.cwd(), "dist-electron/packages/core/src/prompts", relativePath)
    ];
  } else if (resourceUri.startsWith(packagePrefix)) {
    if (registration.source.kind !== "directory") {
      throw new Error(`内置咨询师包没有外部资源目录: ${resourceUri}`);
    }
    const relativePath = validateRelativeResourcePath(resourceUri.slice(packagePrefix.length), resourceUri);
    candidates = [resolveSafePackageFile(registration.source.rootDirectory, relativePath, resourceUri)];
  } else {
    throw new Error(`不支持的咨询师提示词资源: ${resourceUri}`);
  }
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const extension = extname(filePath).toLowerCase();
    if (extension !== ".md" && extension !== ".txt") {
      throw new Error(`咨询师提示词资源类型不支持: ${resourceUri}`);
    }
    if (statSync(filePath).size > MAX_PROMPT_RESOURCE_BYTES) {
      throw new Error(`咨询师提示词资源超过 1 MiB: ${resourceUri}`);
    }
    const prompt = readFileSync(filePath, "utf8").trim();
    if (!prompt) throw new Error(`咨询师提示词资源为空: ${resourceUri}`);
    promptCache.set(cacheKey, prompt);
    return prompt;
  }
  throw new Error(`未找到咨询师提示词资源: ${resourceUri}`);
}

function validateRelativeResourcePath(relativePath: string, resourceUri: string) {
  if (!relativePath || relativePath.startsWith("/") || relativePath.split("/").some((segment) =>
    segment === ".." || segment === "." || segment === ""
  )) {
    throw new Error(`咨询师提示词资源路径不合法: ${resourceUri}`);
  }
  return relativePath;
}

function resolveSafePackageFile(rootDirectory: string, relativePath: string, resourceUri: string) {
  const realRoot = realpathSync(rootDirectory);
  const candidate = resolve(realRoot, relativePath);
  const realCandidate = realpathSync(candidate);
  if (!realCandidate.startsWith(`${realRoot}${sep}`)) {
    throw new Error(`咨询师包资源超出包目录: ${resourceUri}`);
  }
  return realCandidate;
}

function requireLocalizedResource(
  resources: Partial<Record<SupportedLocale, string>>,
  locale: SupportedLocale
) {
  const resource = resources[locale];
  if (!resource) throw new Error(`咨询师包缺少 ${locale} 提示词资源`);
  return resource;
}

function getPromptCandidates(folderName: string, fileName: string, locale: SupportedLocale) {
  const localeSegments = locale === "en-US" ? ["en-US"] : [];
  return [
    resolve(promptModuleDir, ...localeSegments, folderName, fileName),
    resolve(process.cwd(), "packages/core/src/prompts", ...localeSegments, folderName, fileName),
    resolve(process.cwd(), "dist-electron/packages/core/src/prompts", ...localeSegments, folderName, fileName)
  ];
}
