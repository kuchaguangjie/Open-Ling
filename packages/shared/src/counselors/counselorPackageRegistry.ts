import type {
  CounselorPackageManifest,
  CounselorPackageSource,
  RegisteredCounselorPackage
} from "../types/counselorPackage.js";
import { validateCounselorPackageManifest } from "./counselorPackageValidation.js";

export class CounselorPackageRegistry {
  readonly #packages = new Map<string, RegisteredCounselorPackage>();

  constructor(initialPackages: RegisteredCounselorPackage[] = []) {
    for (const registration of initialPackages) this.register(registration);
  }

  register(registration: RegisteredCounselorPackage) {
    const validation = validateCounselorPackageManifest(registration.manifest);
    if (!validation.valid) {
      throw new Error(`Invalid counselor package ${registration.manifest.id}: ${validation.errors.join("; ")}`);
    }
    if (this.#packages.has(registration.manifest.id)) {
      throw new Error(`Counselor package already registered: ${registration.manifest.id}`);
    }
    this.#packages.set(registration.manifest.id, cloneAndFreezeRegistration(registration));
  }

  unregister(counselorId: string) {
    const registration = this.#packages.get(counselorId);
    if (registration?.source.kind === "builtin") {
      throw new Error(`Built-in counselor package cannot be unregistered: ${counselorId}`);
    }
    return this.#packages.delete(counselorId);
  }

  get(counselorId: string) {
    return this.#packages.get(counselorId);
  }

  require(counselorId: string) {
    const registration = this.get(counselorId);
    if (!registration) throw new Error(`Unknown counselor package: ${counselorId}`);
    return registration;
  }

  list() {
    return [...this.#packages.values()];
  }
}

export function createCounselorPackageRegistration(
  manifest: CounselorPackageManifest,
  source: CounselorPackageSource
): RegisteredCounselorPackage {
  return { manifest, source };
}

function cloneAndFreezeRegistration(registration: RegisteredCounselorPackage): RegisteredCounselorPackage {
  return deepFreeze(structuredClone(registration));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
