/** Parses a stored list rating (0–10). Returns undefined when not set. */
export function parseUserRate(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const rate = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 10) {
    return undefined;
  }
  return rate;
}

export function hasUserRate(value: unknown): boolean {
  return parseUserRate(value) != null;
}
