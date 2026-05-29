import type { TranslationTree } from "./locales/en";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, string>
    ? Partial<T[K]>
    : T[K];
};

export function deepMergeLocale(base: TranslationTree, overrides: DeepPartial<TranslationTree>): TranslationTree {
  const result = structuredClone(base);
  for (const section of Object.keys(overrides) as (keyof TranslationTree)[]) {
    const patch = overrides[section];
    if (!patch) continue;
    result[section] = { ...result[section], ...patch } as TranslationTree[typeof section];
  }
  return result;
}
