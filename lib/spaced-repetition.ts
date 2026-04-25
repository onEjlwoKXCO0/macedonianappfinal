import type { WeakItem } from './types';

export function addOrUpdateWeakItem(
  weakItems: WeakItem[],
  exerciseId: string,
  lessonId: string,
  topic: string,
  wasCorrect: boolean,
  today: string
): WeakItem[] {
  const existing = weakItems.find((w) => w.item_id === exerciseId);

  if (!wasCorrect) {
    if (existing) {
      const newEase = Math.max(1.3, existing.ease_factor - 0.2);
      return weakItems.map((w) =>
        w.item_id === exerciseId
          ? {
              ...w,
              wrong_count: w.wrong_count + 1,
              last_wrong: today,
              interval_days: 1,
              ease_factor: newEase,
              next_review: addDays(today, 1),
            }
          : w
      );
    } else {
      return [
        ...weakItems,
        {
          item_id: exerciseId,
          lesson_id: lessonId,
          topic,
          last_wrong: today,
          wrong_count: 1,
          next_review: addDays(today, 1),
          interval_days: 1,
          ease_factor: 2.5,
        },
      ];
    }
  } else if (existing) {
    // Correct review
    const newInterval = Math.round(existing.interval_days * existing.ease_factor);
    return weakItems.map((w) =>
      w.item_id === exerciseId
        ? { ...w, interval_days: newInterval, next_review: addDays(today, newInterval) }
        : w
    );
  }

  return weakItems;
}

export function getDueItems(weakItems: WeakItem[], today: string): WeakItem[] {
  return weakItems
    .filter((w) => w.next_review <= today)
    .sort((a, b) => a.next_review.localeCompare(b.next_review));
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
