/** Leaf module: L0.5 may import this without loading the product graph. */

export type EvalSampling = { temperature: number; top_p: number; seed?: number };

export function createStableContentHash(content: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function batteryPromptHash(runs: Array<{ fixtureId: string; promptContentHash: string }>) {
  const payload = [...new Set(runs.map((run) => `${run.fixtureId}:${run.promptContentHash}`))].sort().join("|");
  return createStableContentHash(payload);
}

/** Layout hash: safety injection, emphasis, compiler split. Separate from the clinical prompt hash. */
export function batteryAssembledHash(runs: Array<{ fixtureId: string; assembledSystemHash: string }>) {
  const payload = [...new Set(runs.map((run) => `${run.fixtureId}:${run.assembledSystemHash}`))].sort().join("|");
  return createStableContentHash(payload);
}

export function samplingKey(sampling: EvalSampling | null | undefined) {
  if (!sampling) return "samp-null";
  return `t${sampling.temperature}-p${sampling.top_p}${sampling.seed != null ? `-s${sampling.seed}` : ""}`;
}
