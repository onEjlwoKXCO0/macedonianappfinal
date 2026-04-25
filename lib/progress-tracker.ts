import type { UserProgress, TopicProgress, SessionHistory } from './types';

export const DEFAULT_PROGRESS: UserProgress = {
  user: {
    daily_goal_minutes: 15,
    streak_current: 0,
    streak_best: 0,
    total_lessons_completed: 0,
    total_exercises_done: 0,
    last_session_date: null,
  },
  topics: {},
  weak_items: [],
  session_history: [],
};

const DEFAULT_TOPIC: TopicProgress = {
  current_level: 1,
  mastery_percent: 0,
  exercises_done: 0,
  exercises_correct: 0,
  last_practiced: null,
  level_scores: { '1': [], '2': [], '3': [], '4': [], '5': [] },
};

export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem('mk_progress');
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    return JSON.parse(raw) as UserProgress;
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mk_progress', JSON.stringify(progress));
}

export function ensureTopic(progress: UserProgress, topicId: string): UserProgress {
  if (!progress.topics[topicId]) {
    return {
      ...progress,
      topics: { ...progress.topics, [topicId]: structuredClone(DEFAULT_TOPIC) },
    };
  }
  return progress;
}

export function recordExerciseResult(
  progress: UserProgress,
  topicId: string,
  correct: boolean,
  today: string
): UserProgress {
  let p = ensureTopic(progress, topicId);
  const topic = { ...p.topics[topicId] };
  topic.exercises_done += 1;
  if (correct) topic.exercises_correct += 1;
  topic.last_practiced = today;
  topic.mastery_percent = Math.round((topic.exercises_correct / topic.exercises_done) * 100);
  return { ...p, topics: { ...p.topics, [topicId]: topic } };
}

export function recordLevelScore(
  progress: UserProgress,
  topicId: string,
  level: number,
  scorePercent: number
): UserProgress {
  let p = ensureTopic(progress, topicId);
  const topic = { ...p.topics[topicId] };
  const scores = [...(topic.level_scores[String(level)] ?? []), scorePercent].slice(-3);
  topic.level_scores = { ...topic.level_scores, [String(level)]: scores };
  return { ...p, topics: { ...p.topics, [topicId]: topic } };
}

export function recordSession(
  progress: UserProgress,
  session: SessionHistory
): UserProgress {
  const today = session.date;
  const last = progress.user.last_session_date;
  const yesterday = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  let streak = progress.user.streak_current;
  if (last === yesterday) streak += 1;
  else if (last !== today) streak = 1;

  const best = Math.max(progress.user.streak_best, streak);

  return {
    ...progress,
    user: {
      ...progress.user,
      streak_current: streak,
      streak_best: best,
      last_session_date: today,
      total_lessons_completed:
        progress.user.total_lessons_completed + session.lessons_completed.length,
      total_exercises_done: progress.user.total_exercises_done + session.exercises_done,
    },
    session_history: [...progress.session_history, session].slice(-90),
  };
}

export function getGlobalMastery(progress: UserProgress): number {
  const topics = Object.values(progress.topics);
  if (topics.length === 0) return 0;
  const total = topics.reduce((acc, t) => acc + t.mastery_percent, 0);
  return Math.round(total / topics.length);
}
