import { supabase } from './supabase';
import { getAllCards, saveAllCards } from './spaced-repetition';
import { getProgress, saveProgress } from './progress-tracker';
import { getDistractorMemory, saveDistractorMemory } from './distractor-engine';
import type { CardState } from './spaced-repetition';

function withTimeout<T>(promise: PromiseLike<T>, ms = 8000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout après ${ms / 1000}s`)), ms)
    ),
  ]);
}

// Single auth call — shared by all functions in one sync pass
export async function getUserId(): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

// ─── Push ──────────────────────────────────────────────────────────────────────

export async function pushCard(card: CardState): Promise<void> {
  const uid = await getUserId();
  if (!uid) return;
  await withTimeout(supabase.from('cards').upsert({
    user_id: uid, exercise_id: card.exercise_id, lesson_id: card.lesson_id,
    topic: card.topic, stability: card.stability, difficulty: card.difficulty,
    due: card.due, reps: card.reps, lapses: card.lapses, state: card.state,
    step_due: card.step_due ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,exercise_id' }));
}

export async function pushAllCards(uid?: string): Promise<void> {
  const userId = uid ?? await getUserId();
  if (!userId) return;
  const cards = Object.values(getAllCards());
  if (cards.length === 0) return;
  const rows = cards.map((c) => ({
    user_id: userId, exercise_id: c.exercise_id, lesson_id: c.lesson_id,
    topic: c.topic, stability: c.stability, difficulty: c.difficulty,
    due: c.due, reps: c.reps, lapses: c.lapses, state: c.state,
    step_due: c.step_due ?? null, updated_at: new Date().toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 500) {
    await withTimeout(supabase.from('cards').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,exercise_id' }));
  }
}

export async function pushProgress(uid?: string): Promise<void> {
  const userId = uid ?? await getUserId();
  if (!userId) return;
  await withTimeout(supabase.from('progress').upsert({
    user_id: userId, data: getProgress(), updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }));
}

export async function pushDistractorMemory(uid?: string): Promise<void> {
  const userId = uid ?? await getUserId();
  if (!userId) return;
  await withTimeout(supabase.from('distractor_memory').upsert({
    user_id: userId, data: getDistractorMemory(), updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }));
}

// ─── Pull ──────────────────────────────────────────────────────────────────────

export async function pullCards(uid?: string): Promise<void> {
  const userId = uid ?? await getUserId();
  if (!userId) return;
  const { data } = await withTimeout(supabase.from('cards').select('*').eq('user_id', userId));
  if (!data || data.length === 0) return;
  const remote: Record<string, CardState> = {};
  for (const row of data) {
    remote[row.exercise_id] = {
      exercise_id: row.exercise_id, lesson_id: row.lesson_id, topic: row.topic,
      stability: row.stability, difficulty: row.difficulty, due: row.due,
      reps: row.reps, lapses: row.lapses, state: row.state,
      step_due: row.step_due ?? undefined, new: row.state === 'new',
    };
  }
  saveAllCards({ ...getAllCards(), ...remote });
}

export async function pullProgress(uid?: string): Promise<void> {
  const userId = uid ?? await getUserId();
  if (!userId) return;
  const { data } = await withTimeout(
    supabase.from('progress').select('data').eq('user_id', userId).maybeSingle()
  );
  if (data?.data) saveProgress(data.data);
}

export async function pullDistractorMemory(uid?: string): Promise<void> {
  const userId = uid ?? await getUserId();
  if (!userId) return;
  const { data } = await withTimeout(
    supabase.from('distractor_memory').select('data').eq('user_id', userId).maybeSingle()
  );
  if (data?.data) saveDistractorMemory(data.data);
}

// ─── Full sync ─────────────────────────────────────────────────────────────────

export async function syncAll(): Promise<void> {
  const uid = await getUserId();
  if (!uid) return;
  await Promise.all([pullCards(uid), pullProgress(uid), pullDistractorMemory(uid)]);
}
