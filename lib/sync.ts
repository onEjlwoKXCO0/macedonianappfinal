/**
 * Local-first sync with Supabase.
 * localStorage is the source of truth for reads.
 * Supabase is updated in the background — never blocks the UI.
 * On login from a new device, remote data is pulled and merged.
 */

import { supabase } from './supabase';
import { getAllCards, saveAllCards } from './spaced-repetition';
import { getProgress, saveProgress } from './progress-tracker';
import { getDistractorMemory, saveDistractorMemory } from './distractor-engine';
import type { CardState } from './spaced-repetition';

async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) console.error('[sync] getUser error:', error.message);
  return user;
}

// ─── Push local → Supabase ────────────────────────────────────────────────────

export async function pushCard(card: CardState): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await supabase.from('cards').upsert({
    user_id: user.id,
    exercise_id: card.exercise_id,
    lesson_id: card.lesson_id,
    topic: card.topic,
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    step_due: card.step_due ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,exercise_id' });
}

export async function pushAllCards(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const cards = Object.values(getAllCards());
  if (cards.length === 0) return;
  const rows = cards.map((c) => ({
    user_id: user.id,
    exercise_id: c.exercise_id,
    lesson_id: c.lesson_id,
    topic: c.topic,
    stability: c.stability,
    difficulty: c.difficulty,
    due: c.due,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    step_due: c.step_due ?? null,
    updated_at: new Date().toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 500) {
    await supabase.from('cards').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,exercise_id' });
  }
}

export async function pushProgress(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await supabase.from('progress').upsert({
    user_id: user.id,
    data: getProgress(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

export async function pushDistractorMemory(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await supabase.from('distractor_memory').upsert({
    user_id: user.id,
    data: getDistractorMemory(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

// ─── Pull Supabase → local ────────────────────────────────────────────────────

export async function pullCards(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const { data } = await supabase.from('cards').select('*').eq('user_id', user.id);
  if (!data || data.length === 0) return;
  const remote: Record<string, CardState> = {};
  for (const row of data) {
    remote[row.exercise_id] = {
      exercise_id: row.exercise_id,
      lesson_id: row.lesson_id,
      topic: row.topic,
      stability: row.stability,
      difficulty: row.difficulty,
      due: row.due,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      step_due: row.step_due ?? undefined,
      new: row.state === 'new',
    };
  }
  // Remote wins — authoritative for cross-device sync
  saveAllCards({ ...getAllCards(), ...remote });
}

export async function pullProgress(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const { data } = await supabase
    .from('progress').select('data').eq('user_id', user.id).single();
  if (data?.data) saveProgress(data.data);
}

export async function pullDistractorMemory(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const { data } = await supabase
    .from('distractor_memory').select('data').eq('user_id', user.id).single();
  if (data?.data) saveDistractorMemory(data.data);
}

// ─── Full sync (called on login) ──────────────────────────────────────────────

export async function syncAll(): Promise<void> {
  await Promise.all([pullCards(), pullProgress(), pullDistractorMemory()]);
}
