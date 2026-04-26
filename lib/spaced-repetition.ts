/**
 * SM-2 spaced repetition — 4-rating Anki-style implementation.
 *
 * Ratings:
 *   0 = Encore   (Again)  — complete blank, review in <1 day
 *   1 = Difficile (Hard)  — remembered with effort
 *   2 = Bien      (Good)  — normal recall
 *   3 = Facile    (Easy)  — trivial recall
 */

export type Rating = 0 | 1 | 2 | 3;

export interface CardState {
  exercise_id: string;
  lesson_id: string;
  topic: string;
  interval: number;      // days until next review
  ease: number;          // ease factor, min 1.3
  due: string;           // ISO date YYYY-MM-DD
  reps: number;          // total successful reviews
  lapses: number;        // times rated Again after graduation
  new: boolean;          // has never been reviewed
}

const MIN_EASE = 1.3;
const INITIAL_EASE = 2.5;

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function getIntervalLabel(rating: Rating, card: CardState): string {
  const next = nextInterval(rating, card);
  if (next < 1) return '<1 jour';
  if (next === 1) return '1 jour';
  if (next < 7) return `${next} jours`;
  if (next < 30) return `${Math.round(next / 7)} sem.`;
  return `${Math.round(next / 30)} mois`;
}

function nextInterval(rating: Rating, card: CardState): number {
  if (card.reps === 0) {
    // New card — first review
    switch (rating) {
      case 0: return 1;
      case 1: return 1;
      case 2: return 1;
      case 3: return 4;
    }
  }
  switch (rating) {
    case 0: return 1;
    case 1: return Math.max(1, Math.ceil(card.interval * 1.2));
    case 2: return Math.max(2, Math.ceil(card.interval * card.ease));
    case 3: return Math.max(3, Math.ceil(card.interval * card.ease * 1.3));
  }
}

function nextEase(rating: Rating, ease: number): number {
  switch (rating) {
    case 0: return Math.max(MIN_EASE, ease - 0.20);
    case 1: return Math.max(MIN_EASE, ease - 0.15);
    case 2: return ease;
    case 3: return Math.min(3.0, ease + 0.15);
  }
}

export function applyRating(card: CardState, rating: Rating, today: string): CardState {
  const interval = nextInterval(rating, card);
  const ease = nextEase(rating, card.ease);
  const lapses = rating === 0 ? card.lapses + 1 : card.lapses;
  const reps = rating === 0 ? card.reps : card.reps + 1;
  return {
    ...card,
    interval,
    ease,
    due: addDays(today, interval),
    reps,
    lapses,
    new: false,
  };
}

export function createCard(exerciseId: string, lessonId: string, topic: string, today: string): CardState {
  return {
    exercise_id: exerciseId,
    lesson_id: lessonId,
    topic,
    interval: 0,
    ease: INITIAL_EASE,
    due: today,
    reps: 0,
    lapses: 0,
    new: true,
  };
}

// ─── Storage helpers (localStorage) ──────────────────────────────────────────

const STORAGE_KEY = 'mk_cards';

export function getAllCards(): Record<string, CardState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveAllCards(cards: Record<string, CardState>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function getCard(exerciseId: string): CardState | null {
  return getAllCards()[exerciseId] ?? null;
}

export function upsertCard(card: CardState): void {
  const all = getAllCards();
  all[card.exercise_id] = card;
  saveAllCards(all);
}

export function getDueCards(today: string, limit = 200): CardState[] {
  const all = Object.values(getAllCards());
  return all
    .filter((c) => c.due <= today)
    .sort((a, b) => {
      if (a.new !== b.new) return a.new ? 1 : -1; // reviews before new
      return a.due.localeCompare(b.due);
    })
    .slice(0, limit);
}

export function getNewCards(limit = 20): CardState[] {
  return Object.values(getAllCards())
    .filter((c) => c.new)
    .slice(0, limit);
}

export function getDueCount(today: string): number {
  return Object.values(getAllCards()).filter((c) => !c.new && c.due <= today).length;
}

export function getNewCount(): number {
  return Object.values(getAllCards()).filter((c) => c.new).length;
}

export function ensureCardsForLesson(lessonId: string, topic: string, exerciseIds: string[], today: string): void {
  const all = getAllCards();
  let changed = false;
  for (const id of exerciseIds) {
    if (!all[id]) {
      all[id] = createCard(id, lessonId, topic, today);
      changed = true;
    }
  }
  if (changed) saveAllCards(all);
}

// Legacy helpers for backward compatibility
export function addOrUpdateWeakItem(
  weakItems: import('./types').WeakItem[],
  exerciseId: string,
  lessonId: string,
  topic: string,
  wasCorrect: boolean,
  today: string
): import('./types').WeakItem[] {
  if (wasCorrect) return weakItems;
  const existing = weakItems.find((w) => w.item_id === exerciseId);
  if (existing) {
    return weakItems.map((w) =>
      w.item_id === exerciseId
        ? { ...w, wrong_count: w.wrong_count + 1, last_wrong: today, next_review: today, interval_days: 1 }
        : w
    );
  }
  return [...weakItems, { item_id: exerciseId, lesson_id: lessonId, topic, last_wrong: today, wrong_count: 1, next_review: today, interval_days: 1, ease_factor: 2.5 }];
}

export function getDueItems(weakItems: import('./types').WeakItem[], today: string): import('./types').WeakItem[] {
  return weakItems.filter((w) => w.next_review <= today).sort((a, b) => a.next_review.localeCompare(b.next_review));
}
