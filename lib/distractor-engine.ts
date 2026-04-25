import type { DistractorMemory, Confusion } from './types';

export function getDistractorMemory(): DistractorMemory {
  if (typeof window === 'undefined') return { confusions: [], micro_lessons_injected: [] };
  try {
    const raw = localStorage.getItem('mk_distractors');
    if (!raw) return { confusions: [], micro_lessons_injected: [] };
    return JSON.parse(raw) as DistractorMemory;
  } catch {
    return { confusions: [], micro_lessons_injected: [] };
  }
}

export function saveDistractorMemory(mem: DistractorMemory): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mk_distractors', JSON.stringify(mem));
}

export function recordWrongAnswer(
  correct: string,
  chosen: string,
  topic: string,
  exerciseType: string,
  lessonId: string
): void {
  const mem = getDistractorMemory();
  const today = new Date().toISOString().slice(0, 10);
  const existing = mem.confusions.find(
    (c) => c.correct === correct && c.chosen_instead === chosen
  );
  if (existing) {
    existing.count += 1;
    existing.last_seen = today;
    if (!existing.lesson_ids.includes(lessonId)) existing.lesson_ids.push(lessonId);
  } else {
    mem.confusions.push({
      correct,
      chosen_instead: chosen,
      topic,
      exercise_type: exerciseType,
      count: 1,
      last_seen: today,
      lesson_ids: [lessonId],
    });
  }
  saveDistractorMemory(mem);
}

export function getForcedDistractors(correctAnswer: string): Confusion[] {
  const mem = getDistractorMemory();
  return mem.confusions.filter(
    (c) => c.correct === correctAnswer && c.count >= 2
  );
}

export function getTopConfusions(limit = 5): Confusion[] {
  const mem = getDistractorMemory();
  return [...mem.confusions]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
