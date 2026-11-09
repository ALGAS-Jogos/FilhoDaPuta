export interface Rng {
  /** Float em [0, 1). */
  next(): number;
  /** Inteiro em [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

/** Gerador determinístico (mulberry32). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    nextInt(maxExclusive: number): number {
      if (maxExclusive <= 0) {
        return 0;
      }
      return Math.floor(this.next() * maxExclusive);
    },
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    const current = copy[i];
    const other = copy[j];
    if (current === undefined || other === undefined) {
      continue;
    }
    copy[i] = other;
    copy[j] = current;
  }
  return copy;
}
