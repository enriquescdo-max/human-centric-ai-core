/**
 * Golden-ratio spacing and type scale. The "right brain" treats cognitive
 * overload as a design defect: spacing and type sizes step by PHI so the
 * interface feels calm and intentional rather than dense and anxious.
 */
export const PHI = 1.618033988749895;

/** A modular scale: base * PHI^step. Use for font sizes or spacing. */
export function scale(base: number, step: number): number {
  return Math.round(base * Math.pow(PHI, step) * 1000) / 1000;
}

/** Generate an ascending type scale, e.g. typeScale(16, 5). */
export function typeScale(base: number, steps: number): number[] {
  return Array.from({ length: steps }, (_, i) => scale(base, i));
}

/** Split a length into golden-ratio major/minor parts (e.g. content vs. rail). */
export function goldenSplit(total: number): { major: number; minor: number } {
  const major = total / PHI;
  return { major: Math.round(major), minor: Math.round(total - major) };
}
