import type { TopicProgress } from './types';
import { ensureTopic, recordLevelScore, saveProgress, getProgress } from './progress-tracker';

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Reconnaissance',
  2: 'Rappel',
  3: 'Manipulation',
  4: 'Construction',
  5: 'Production libre',
};

export function evaluateLevelProgression(topic: TopicProgress): number {
  const current = topic.current_level;
  const scores = topic.level_scores[String(current)] ?? [];
  if (scores.length < 3) return current;

  const last3 = scores.slice(-3);
  const avg = last3.reduce((a, b) => a + b, 0) / 3;

  if (avg >= 85 && current < 5) return current + 1;
  if (avg < 50 && current > 1) return current - 1;
  return current;
}

export function applyLevelProgression(topicId: string, scorePercent: number): void {
  let progress = getProgress();
  progress = ensureTopic(progress, topicId);
  progress = recordLevelScore(progress, topicId, progress.topics[topicId].current_level, scorePercent);

  const newLevel = evaluateLevelProgression(progress.topics[topicId]);
  if (newLevel !== progress.topics[topicId].current_level) {
    progress = {
      ...progress,
      topics: {
        ...progress.topics,
        [topicId]: { ...progress.topics[topicId], current_level: newLevel },
      },
    };
  }

  saveProgress(progress);
}

export function shouldShortenExplanation(topic: TopicProgress): boolean {
  const scores = topic.level_scores[String(topic.current_level)] ?? [];
  if (scores.length < 3) return false;
  const avg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
  return avg > 85;
}

export function shouldExtendExplanation(topic: TopicProgress): boolean {
  const scores = topic.level_scores[String(topic.current_level)] ?? [];
  if (scores.length < 3) return false;
  const avg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
  return avg < 60;
}

export function getPhase1Ratio(topic: TopicProgress): number {
  if (shouldExtendExplanation(topic)) return 0.5;
  if (shouldShortenExplanation(topic)) return 0.2;
  return 0.35;
}
