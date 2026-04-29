/**
 * FSRS-5 — Free Spaced Repetition Scheduler
 *
 * Algorithme basé sur la courbe d'oubli de Ebbinghaus, calibré sur les
 * paramètres Anki de l'utilisateur. Rétention cible : 90%.
 *
 * Ratings : 0=Encore  1=Difficile  2=Bien  3=Facile
 */

export type Rating = 0 | 1 | 2 | 3;

// Paramètres FSRS-5 portés depuis Anki (21 valeurs w[0]…w[20])
const W: readonly number[] = [
  0.2120, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.0010,
  1.8722, 0.1666, 0.7960, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1; // ≈ 19/81 for 90% retention
const TARGET_RETENTION = 0.9;
// Default — overridden by user settings (lib/settings.ts)
const NEW_CARDS_PER_DAY_DEFAULT = 15;

function getNewCardsPerDayLimit(): number {
  if (typeof window === 'undefined') return NEW_CARDS_PER_DAY_DEFAULT;
  try {
    const raw = localStorage.getItem('mk_settings');
    if (!raw) return NEW_CARDS_PER_DAY_DEFAULT;
    return JSON.parse(raw).newCardsPerDay ?? NEW_CARDS_PER_DAY_DEFAULT;
  } catch { return NEW_CARDS_PER_DAY_DEFAULT; }
}

export interface CardState {
  exercise_id: string;
  lesson_id: string;
  topic: string;
  // FSRS state
  stability: number;   // S — days to 90% retention
  difficulty: number;  // D — inherent card difficulty [1,10]
  due: string;         // ISO date YYYY-MM-DD
  reps: number;        // total successful reviews
  lapses: number;      // times rated Again after graduation
  state: 'new' | 'learning' | 'review' | 'relearning';
  // Learning/relearning step tracking (minutes remaining)
  step_due?: string;   // ISO datetime for intra-day steps
  // Legacy compat
  new: boolean;
}

// ─── FSRS core formulas ───────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Retrievability at elapsed days given stability */
function retrievability(elapsed: number, stability: number): number {
  return (1 + FACTOR * elapsed / stability) ** DECAY;
}

/** Initial stability for a new card rated G (first review) */
function initStability(rating: Rating): number {
  return Math.max(0.1, W[rating]);
}

/** Initial difficulty for a new card rated G */
function initDifficulty(rating: Rating): number {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10);
}

/** Difficulty after a review */
function nextDifficulty(d: number, rating: Rating): number {
  const delta = W[6] * (rating - 3);
  const mean_reversion = W[7] * (W[4] - d);
  return clamp(d - delta + mean_reversion, 1, 10);
}


/** Stability after a successful review */
function recallStability(d: number, s: number, r: number, rating: Rating): number {
  const hard_penalty = rating === 1 ? W[15] : 1;
  const easy_bonus   = rating === 3 ? W[16] : 1;
  return s * (
    Math.exp(W[8]) *
    (11 - d) *
    s ** (-W[9]) *
    (Math.exp(W[10] * (1 - r)) - 1) *
    hard_penalty *
    easy_bonus + 1
  );
}

/** Stability after forgetting (rating === 0) */
function forgetStability(d: number, s: number, r: number): number {
  return (
    W[11] *
    d ** (-W[12]) *
    ((s + 1) ** W[13] - 1) *
    Math.exp(W[14] * (1 - r))
  );
}

/** Days until next review to hit TARGET_RETENTION */
function nextInterval(stability: number): number {
  const raw = (stability / FACTOR) * (TARGET_RETENTION ** (1 / DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

// ─── Learning steps ────────────────────────────────────────────────────────────

const LEARNING_STEPS_MIN = [1, 10];     // minutes
const RELEARNING_STEPS_MIN = [10];

function addMinutes(base: string, minutes: number): string {
  return new Date(new Date(base).getTime() + minutes * 60_000).toISOString();
}

function nowISO() { return new Date().toISOString(); }

// ─── Public API ────────────────────────────────────────────────────────────────

export function applyRating(card: CardState, rating: Rating, today: string): CardState {
  const now = nowISO();

  if (card.state === 'new') {
    // First ever review
    const s = initStability(rating);
    const d = initDifficulty(rating);

    if (rating === 0) {
      // Again on new card → restart learning at step 0
      return {
        ...card,
        stability: s,
        difficulty: d,
        state: 'learning',
        step_due: addMinutes(now, LEARNING_STEPS_MIN[0]),
        reps: 0,
        lapses: 0,
        new: false,
      };
    }

    // Check if more learning steps remain
    const stepIdx = rating === 1 ? 0 : LEARNING_STEPS_MIN.length - 1;
    if (stepIdx < LEARNING_STEPS_MIN.length - 1) {
      return {
        ...card,
        stability: s,
        difficulty: d,
        state: 'learning',
        step_due: addMinutes(now, LEARNING_STEPS_MIN[stepIdx + 1]),
        reps: 0,
        lapses: 0,
        new: false,
      };
    }

    // Graduate to review
    return {
      ...card,
      stability: s,
      difficulty: d,
      state: rating === 3 ? 'review' : 'learning',
      due: addDays(today, nextInterval(s)),
      step_due: undefined,
      reps: 1,
      lapses: 0,
      new: false,
    };
  }

  if (card.state === 'learning' || card.state === 'relearning') {
    const steps = card.state === 'learning' ? LEARNING_STEPS_MIN : RELEARNING_STEPS_MIN;

    if (rating === 0) {
      return { ...card, step_due: addMinutes(now, steps[0]) };
    }
    if (rating === 1) {
      // Stay at current step or restart
      return { ...card, step_due: addMinutes(now, steps[0]) };
    }

    // Graduate (rating 2 or 3)
    const elapsed = card.reps > 0 ? 1 : 0;
    const r = retrievability(elapsed, card.stability);
    const s = card.state === 'relearning'
      ? forgetStability(card.difficulty, card.stability, r)
      : card.stability;
    const d = nextDifficulty(card.difficulty, rating);
    const interval = nextInterval(s);

    return {
      ...card,
      stability: Math.max(0.1, s),
      difficulty: clamp(d, 1, 10),
      due: addDays(today, interval),
      step_due: undefined,
      state: 'review',
      reps: card.reps + 1,
      new: false,
    };
  }

  // state === 'review'
  const elapsed = daysBetween(card.due, today);
  const r = retrievability(Math.max(0, elapsed), card.stability);
  const d = nextDifficulty(card.difficulty, rating);

  if (rating === 0) {
    // Lapse — enter relearning
    const s = forgetStability(card.difficulty, card.stability, r);
    return {
      ...card,
      stability: Math.max(0.1, s),
      difficulty: clamp(d, 1, 10),
      state: 'relearning',
      step_due: addMinutes(now, RELEARNING_STEPS_MIN[0]),
      due: card.due, // unchanged until graduation
      lapses: card.lapses + 1,
      new: false,
    };
  }

  const s = recallStability(card.difficulty, card.stability, r, rating);
  const interval = nextInterval(Math.max(0.1, s));

  return {
    ...card,
    stability: Math.max(0.1, s),
    difficulty: clamp(d, 1, 10),
    due: addDays(today, interval),
    step_due: undefined,
    state: 'review',
    reps: card.reps + 1,
    new: false,
  };
}

// ─── Interval preview (for rating buttons) ────────────────────────────────────

export function getIntervalLabel(rating: Rating, card: CardState): string {
  if (card.state === 'new' || card.state === 'learning') {
    if (rating === 0) return '1 min';
    if (rating === 1) return '1 min';
    const steps = LEARNING_STEPS_MIN;
    const min = steps[steps.length - 1];
    return min < 60 ? `${min} min` : `${Math.round(min / 60)} h`;
  }
  if (card.state === 'relearning') {
    if (rating === 0 || rating === 1) return '10 min';
  }

  // Approximate next interval for review state
  const elapsed = daysBetween(card.due, new Date().toISOString().slice(0, 10));
  const r = retrievability(Math.max(0, elapsed), card.stability);
  const d = card.difficulty;

  let s: number;
  if (rating === 0) {
    s = forgetStability(d, card.stability, r);
  } else {
    s = recallStability(d, card.stability, r, rating);
  }

  const days = nextInterval(Math.max(0.1, s));
  if (days < 7)  return `${days} j`;
  if (days < 30) return `${Math.round(days / 7)} sem.`;
  return `${Math.round(days / 30)} mois`;
}

// ─── Card factory ──────────────────────────────────────────────────────────────

export function createCard(exerciseId: string, lessonId: string, topic: string, today: string): CardState {
  return {
    exercise_id: exerciseId,
    lesson_id: lessonId,
    topic,
    stability: W[0],
    difficulty: W[4],
    due: today,
    reps: 0,
    lapses: 0,
    state: 'new',
    new: true,
  };
}

// ─── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mk_cards';
const DAILY_NEW_KEY = 'mk_daily_new';

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

// ─── Daily new card quota ──────────────────────────────────────────────────────

function getDailyNewState(): { date: string; count: number } {
  if (typeof window === 'undefined') return { date: '', count: 0 };
  try {
    const raw = localStorage.getItem(DAILY_NEW_KEY);
    return raw ? JSON.parse(raw) : { date: '', count: 0 };
  } catch { return { date: '', count: 0 }; }
}

function incrementDailyNew(today: string): void {
  const state = getDailyNewState();
  const count = state.date === today ? state.count + 1 : 1;
  localStorage.setItem(DAILY_NEW_KEY, JSON.stringify({ date: today, count }));
}

export function getRemainingNewToday(today: string): number {
  const limit = getNewCardsPerDayLimit();
  const state = getDailyNewState();
  if (state.date !== today) return limit;
  return Math.max(0, limit - state.count);
}

// ─── Queue builders ────────────────────────────────────────────────────────────

/** Cards due for review today (excluding new) */
export function getDueCards(today: string, limit = 200): CardState[] {
  const now = Date.now();
  return Object.values(getAllCards())
    .filter((c) => {
      if (c.state === 'new') return false;
      // Intra-day learning/relearning steps
      if ((c.state === 'learning' || c.state === 'relearning') && c.step_due) {
        return new Date(c.step_due).getTime() <= now;
      }
      return c.due <= today;
    })
    .sort((a, b) => {
      // Learning steps first, then by due date
      const aStep = a.state === 'learning' || a.state === 'relearning';
      const bStep = b.state === 'learning' || b.state === 'relearning';
      if (aStep !== bStep) return aStep ? -1 : 1;
      return (a.due).localeCompare(b.due);
    })
    .slice(0, limit);
}

/** New cards for today, respecting the daily cap */
export function getNewCards(today: string): CardState[] {
  const remaining = getRemainingNewToday(today);
  if (remaining <= 0) return [];
  return Object.values(getAllCards())
    .filter((c) => c.state === 'new')
    .slice(0, remaining);
}

export function getDueCount(today: string): number {
  const now = Date.now();
  return Object.values(getAllCards()).filter((c) => {
    if (c.state === 'new') return false;
    if ((c.state === 'learning' || c.state === 'relearning') && c.step_due) {
      return new Date(c.step_due).getTime() <= now;
    }
    return c.due <= today;
  }).length;
}

export function getNewCount(): number {
  return Object.values(getAllCards()).filter((c) => c.state === 'new').length;
}

/**
 * Register exercises as new cards — called only when a lesson is completed.
 * Respects the daily new card cap.
 */
export function ensureCardsForLesson(
  lessonId: string,
  topic: string,
  exerciseIds: string[],
  today: string
): void {
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

/** Mark new cards as introduced today (call when first shown to user) */
export function markCardIntroduced(today: string): void {
  incrementDailyNew(today);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ─── Legacy helpers (backward compat with daily/page.tsx) ─────────────────────

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
  return [...weakItems, {
    item_id: exerciseId, lesson_id: lessonId, topic,
    last_wrong: today, wrong_count: 1, next_review: today,
    interval_days: 1, ease_factor: 2.5,
  }];
}

export function getDueItems(
  weakItems: import('./types').WeakItem[],
  today: string
): import('./types').WeakItem[] {
  return weakItems
    .filter((w) => w.next_review <= today)
    .sort((a, b) => a.next_review.localeCompare(b.next_review));
}
