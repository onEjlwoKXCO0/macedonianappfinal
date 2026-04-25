import type { ConjugationTable } from './types';

const cache: Record<string, ConjugationTable> = {};

export async function loadConjugationTable(verb: string): Promise<ConjugationTable | null> {
  if (cache[verb]) return cache[verb];
  try {
    const res = await fetch(`/api/conjugation/${verb}`);
    if (!res.ok) return null;
    const data = await res.json() as ConjugationTable;
    cache[verb] = data;
    return data;
  } catch {
    return null;
  }
}

export async function loadConjugationTables(verbs: string[]): Promise<Record<string, ConjugationTable>> {
  const results: Record<string, ConjugationTable> = {};
  await Promise.all(
    verbs.map(async (verb) => {
      const table = await loadConjugationTable(verb);
      if (table) results[verb] = table;
    })
  );
  return results;
}

export function findHighlightedRow(
  table: ConjugationTable,
  tense: string,
  sentence: string
): string | null {
  const tenseTable = table.tables[tense];
  if (!tenseTable) return null;
  const sentenceLower = sentence.toLowerCase();
  for (const [person, form] of Object.entries(tenseTable)) {
    if (sentenceLower.includes(form.toLowerCase())) return person;
  }
  return null;
}
