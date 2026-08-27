import {
  COUNSELOR_PACKAGE_SCHEMA_VERSION,
  type CounselorPackageValidationResult
} from "../types/counselorPackage.js";
import type { CounselorApproach } from "../types/counselor.js";
import {
  COUNSELOR_PACKAGE_ENGINE_VERSION,
  isCounselorEngineCompatible,
  isSupportedCounselorEngineRange
} from "./counselorPackageCompatibility.js";

const supportedApproaches = new Set<CounselorApproach>([
  "emotion-dynamic",
  "reality-structure",
  "eastern-contemplative",
  "integrative",
  "emotion-focused",
  "mindfulness-existential"
]);

export function validateCounselorPackageManifest(
  value: unknown
): CounselorPackageValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["manifest must be an object"] };
  if (value.schemaVersion !== COUNSELOR_PACKAGE_SCHEMA_VERSION) {
    errors.push(`unsupported schemaVersion: ${String(value.schemaVersion)}`);
  }
  validatePackageId(value.id, errors);
  validateVersion(value.version, "version", errors);
  if (!isNonEmptyString(value.engineCompatibility)) {
    errors.push("engineCompatibility is required");
  } else if (!isSupportedCounselorEngineRange(value.engineCompatibility)) {
    errors.push("engineCompatibility must use space-separated semantic-version comparators");
  } else if (!isCounselorEngineCompatible(value.engineCompatibility)) {
    errors.push(
      `engineCompatibility ${value.engineCompatibility} does not include Ling counselor engine ${COUNSELOR_PACKAGE_ENGINE_VERSION}`
    );
  }
  if (!isRecord(value.publisher) || !isNonEmptyString(value.publisher.name)) {
    errors.push("publisher.name is required");
  }
  if (!isRecord(value.license) || !isNonEmptyString(value.license.prompts) || !isNonEmptyString(value.license.assets)) {
    errors.push("license.prompts and license.assets are required");
  }
  if (!isNonEmptyString(value.approach) || !supportedApproaches.has(value.approach as CounselorApproach)) {
    errors.push("approach is unsupported");
  }
  validateLocalizations(value.localizations, errors);
  validatePromptResources(value.prompts, errors);
  validateSafetyRequirements(value.safety, errors);
  validateVisualResources(value.visuals, errors);
  if ("memory" in value) errors.push("memory is managed by Ling and must not be declared by a counselor package");
  if ("capabilities" in value) errors.push("capabilities are fixed by Ling and must not be declared by a counselor package");
  return { valid: errors.length === 0, errors };
}

export function isCounselorPackageResourceUri(value: unknown): value is string {
  if (!isNonEmptyString(value) || (!value.startsWith("builtin://") && !value.startsWith("package://"))) {
    return false;
  }
  const path = value.slice(value.indexOf("://") + 3);
  return Boolean(path) && !path.startsWith("/") && !path.split("/").some((segment) =>
    segment === "." || segment === ".." || segment === ""
  );
}

function validateLocalizations(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("localizations are required");
    return;
  }
  for (const localeId of ["zh-CN", "en-US"] as const) {
    validateLocaleContent(value[localeId], localeId, errors);
  }
}

function validatePromptResources(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("prompts are required");
    return;
  }
  validateLocaleResourceMap(value.counselorCore, "prompts.counselorCore", errors);
  validateLocaleResourceMap(value.counselingDialogue, "prompts.counselingDialogue", errors);
  if (value.counselorVoice !== undefined) {
    validateOptionalLocaleResourceMap(value.counselorVoice, "prompts.counselorVoice", errors);
  }
}

function validateSafetyRequirements(value: unknown, errors: string[]) {
  if (!isRecord(value) || !isNonEmptyString(value.minimumPolicyVersion)) {
    errors.push("safety.minimumPolicyVersion is required");
    return;
  }
  if (!/^\d+(?:\.\d+){0,2}$/u.test(value.minimumPolicyVersion)) {
    errors.push("safety.minimumPolicyVersion must be a numeric policy version");
  }
  if (!Array.isArray(value.additionalPolicies) || !value.additionalPolicies.every(isNonEmptyString)) {
    errors.push("safety.additionalPolicies must be an array of resource URIs");
    return;
  }
  value.additionalPolicies.forEach((resource, index) =>
    validateResourceUri(resource, `safety.additionalPolicies.${index}`, errors)
  );
}

function validateVisualResources(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("visual resources are required");
    return;
  }
  for (const key of ["avatar", "portrait", "room"] as const) {
    validateResourceUri(value[key], `visuals.${key}`, errors);
  }
  for (const key of ["openingSequence", "closingSequence"] as const) {
    if (value[key] !== undefined) validateResourceUri(value[key], `visuals.${key}`, errors);
  }
}

function validatePackageId(value: unknown, errors: string[]) {
  if (!isNonEmptyString(value) || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(value)) {
    errors.push("id must contain lowercase letters, digits, dots, underscores or hyphens");
  }
}

function validateVersion(value: unknown, field: string, errors: string[]) {
  if (!isNonEmptyString(value) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value)) {
    errors.push(`${field} must be a semantic version`);
  }
}

function validateLocaleContent(value: unknown, field: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`localizations.${field} is required`);
    return;
  }
  for (const key of ["name", "title", "description"] as const) {
    if (!isNonEmptyString(value[key])) errors.push(`localizations.${field}.${key} is required`);
  }
  if (!Array.isArray(value.strengths) || value.strengths.length === 0 || !value.strengths.every(isNonEmptyString)) {
    errors.push(`localizations.${field}.strengths must not be empty`);
  }
  if (!isRecord(value.opening)) {
    errors.push(`localizations.${field}.opening is required`);
  } else {
    for (const key of ["first", "second", "returning"] as const) {
      if (!Array.isArray(value.opening[key]) || value.opening[key].length === 0 || !value.opening[key].every(isNonEmptyString)) {
        errors.push(`localizations.${field}.opening.${key} must not be empty`);
      }
    }
  }
  if (!Array.isArray(value.closings) || value.closings.length === 0 || !value.closings.every(isNonEmptyString)) {
    errors.push(`localizations.${field}.closings must not be empty`);
  }
}

function validateLocaleResourceMap(value: unknown, field: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${field} is required`);
    return;
  }
  for (const localeId of ["zh-CN", "en-US"] as const) {
    validateResourceUri(value[localeId], `${field}.${localeId}`, errors);
  }
}

function validateOptionalLocaleResourceMap(value: unknown, field: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${field} must be a locale resource map`);
    return;
  }
  for (const localeId of ["zh-CN", "en-US"] as const) {
    if (value[localeId] !== undefined) validateResourceUri(value[localeId], `${field}.${localeId}`, errors);
  }
}

function validateResourceUri(value: unknown, field: string, errors: string[]) {
  if (!isCounselorPackageResourceUri(value)) {
    if (!isNonEmptyString(value) || (!value.startsWith("builtin://") && !value.startsWith("package://"))) {
      errors.push(`${field} must be a builtin:// or package:// resource URI`);
    } else {
      errors.push(`${field} contains an unsafe resource path`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
