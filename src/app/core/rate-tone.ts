export type RateTone = 'skull' | 'bad' | 'mid' | 'good' | 'perfect' | 'none';

export function rateTone(rate: number | undefined | null): RateTone {
  if (rate == null || !Number.isFinite(rate)) {
    return 'none';
  }
  const r = Math.round(rate);
  if (r < 0 || r > 10) {
    return 'none';
  }
  if (r <= 3) {
    return 'skull';
  }
  if (r === 4) {
    return 'bad';
  }
  if (r <= 6) {
    return 'mid';
  }
  if (r <= 9) {
    return 'good';
  }
  return 'perfect';
}

export function rateLabel(rate: number | undefined | null): string {
  const tone = rateTone(rate);
  if (tone === 'none') {
    return 'No rate';
  }
  if (tone === 'skull') {
    return '💀';
  }
  return String(Math.round(rate!));
}

export function rateAriaLabel(rate: number | undefined | null): string | null {
  const tone = rateTone(rate);
  if (tone === 'none') {
    return null;
  }
  const value = Math.round(rate!);
  if (tone === 'skull') {
    return `Rate ${value}, very low`;
  }
  return `Rate ${value}`;
}
