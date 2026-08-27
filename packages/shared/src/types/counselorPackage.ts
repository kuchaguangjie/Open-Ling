import type { CounselorApproach } from "./counselor.js";
import type { SupportedLocale } from "./settings.js";

export const COUNSELOR_PACKAGE_SCHEMA_VERSION = 1 as const;

export type CounselorPackageSchemaVersion = typeof COUNSELOR_PACKAGE_SCHEMA_VERSION;

export interface CounselorPackagePublisher {
  name: string;
  website?: string;
}

export interface CounselorPackageLicense {
  prompts: string;
  assets: string;
}

export interface CounselorPackageOpeningCopy {
  first: string[];
  second: string[];
  returning: string[];
}

export interface CounselorPackageLocaleContent {
  name: string;
  title: string;
  description: string;
  strengths: string[];
  opening: CounselorPackageOpeningCopy;
  closings: string[];
}

export interface CounselorPackagePromptResources {
  counselorCore: Partial<Record<SupportedLocale, string>>;
  counselingDialogue: Partial<Record<SupportedLocale, string>>;
  counselorVoice?: Partial<Record<SupportedLocale, string>>;
}

export interface CounselorPackageSafetyRequirements {
  minimumPolicyVersion: string;
  additionalPolicies: string[];
}

/**
 * Visual resources are logical IDs rather than filesystem paths. Renderer or
 * host applications resolve them without granting packages filesystem access.
 */
export interface CounselorPackageVisualResources {
  avatar: string;
  portrait: string;
  room: string;
  openingSequence?: string;
  closingSequence?: string;
}

export type CounselorPackageSource =
  | { kind: "builtin" }
  | { kind: "directory"; rootDirectory: string }
  | { kind: "host" };

export interface RegisteredCounselorPackage {
  manifest: CounselorPackageManifest;
  source: CounselorPackageSource;
}

export interface CounselorPackageManifest {
  schemaVersion: CounselorPackageSchemaVersion;
  id: string;
  version: string;
  engineCompatibility: string;
  publisher: CounselorPackagePublisher;
  license: CounselorPackageLicense;
  approach: CounselorApproach;
  localizations: Record<SupportedLocale, CounselorPackageLocaleContent>;
  prompts: CounselorPackagePromptResources;
  safety: CounselorPackageSafetyRequirements;
  visuals: CounselorPackageVisualResources;
}

export interface CounselorPackageValidationResult {
  valid: boolean;
  errors: string[];
}

export type CounselorPackageInstallResult =
  | { status: "cancelled" }
  | { status: "preview"; manifest: CounselorPackageManifest; previewToken: string; currentVersion?: string }
  | { status: "installed"; manifest: CounselorPackageManifest }
  | { status: "updated"; manifest: CounselorPackageManifest; previousVersion: string };

export type CounselorPackageRemoveResult =
  | { status: "cancelled" }
  | { status: "removed"; packageId: string };
