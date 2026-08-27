export const COUNSELOR_PACKAGE_ENGINE_VERSION = "1.0.0";

const comparatorPattern = /^(>=|>|<=|<|=)?(\d+\.\d+\.\d+)$/u;

export function isSupportedCounselorEngineRange(range: string) {
  const comparators = range.trim().split(/\s+/u).filter(Boolean);
  return comparators.length > 0 && comparators.every((comparator) => comparatorPattern.test(comparator));
}

export function isCounselorEngineCompatible(
  range: string,
  engineVersion = COUNSELOR_PACKAGE_ENGINE_VERSION
) {
  if (!isSupportedCounselorEngineRange(range) || !parseVersion(engineVersion)) return false;
  return range.trim().split(/\s+/u).every((comparator) => {
    const match = comparator.match(comparatorPattern);
    if (!match) return false;
    const comparison = compareVersions(engineVersion, match[2]);
    switch (match[1] ?? "=") {
      case ">=": return comparison >= 0;
      case ">": return comparison > 0;
      case "<=": return comparison <= 0;
      case "<": return comparison < 0;
      default: return comparison === 0;
    }
  });
}

export function compareCounselorPackageVersions(left: string, right: string) {
  const leftVersion = parsePackageVersion(left);
  const rightVersion = parsePackageVersion(right);
  if (!leftVersion || !rightVersion) throw new Error("Invalid counselor package version");
  for (let index = 0; index < 3; index += 1) {
    const difference = leftVersion.numbers[index] - rightVersion.numbers[index];
    if (difference !== 0) return difference;
  }
  if (!leftVersion.prerelease && !rightVersion.prerelease) return 0;
  if (!leftVersion.prerelease) return 1;
  if (!rightVersion.prerelease) return -1;
  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}

function compareVersions(left: string, right: string) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  if (!leftParts || !rightParts) throw new Error("Invalid counselor engine version");
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

function parseVersion(value: string) {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/u);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] as const : undefined;
}

function parsePackageVersion(value: string) {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/u);
  return match ? {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])] as const,
    prerelease: match[4]
  } : undefined;
}

function comparePrerelease(left: string, right: string) {
  const leftParts = left.split(".");
  const rightParts = right.split(".");
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/u.test(leftPart) ? Number(leftPart) : undefined;
    const rightNumber = /^\d+$/u.test(rightPart) ? Number(rightPart) : undefined;
    if (leftNumber !== undefined && rightNumber !== undefined) return leftNumber - rightNumber;
    if (leftNumber !== undefined) return -1;
    if (rightNumber !== undefined) return 1;
    return leftPart.localeCompare(rightPart);
  }
  return 0;
}
