export function compareEndedSessionsNewestFirst(
  left: { id: string; endedAt?: string; createdAt?: string },
  right: { id: string; endedAt?: string; createdAt?: string }
) {
  const endedAtDifference = timestamp(right.endedAt) - timestamp(left.endedAt);
  if (endedAtDifference !== 0) return endedAtDifference;
  const createdAtDifference = timestamp(right.createdAt) - timestamp(left.createdAt);
  if (createdAtDifference !== 0) return createdAtDifference;
  return right.id.localeCompare(left.id);
}

function timestamp(value?: string) {
  const parsed = value ? Date.parse(value) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}
