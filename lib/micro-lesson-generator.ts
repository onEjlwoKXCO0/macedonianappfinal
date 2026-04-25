import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { Lesson, Exercise, Confusion } from './types';

const APPROVED = path.join(process.cwd(), 'data', 'approved');

export async function generateMicroLesson(confusion: Confusion): Promise<Lesson | null> {
  // Pull exercises from approved lessons that contain both items
  const files = await readdir(APPROVED);
  const targetExercises: Exercise[] = [];

  for (const f of files.filter((f) => f.endsWith('.json'))) {
    try {
      const lesson: Lesson = JSON.parse(await readFile(path.join(APPROVED, f), 'utf-8'));
      for (const ex of lesson.exercises) {
        const correctLower = ex.correct_answer.toLowerCase();
        const confCorrect = confusion.correct.toLowerCase();
        const confChosen = confusion.chosen_instead.toLowerCase();
        if (
          correctLower.includes(confCorrect) ||
          correctLower.includes(confChosen) ||
          (ex.type === 'multiple_choice' && ex.options?.some(
            (o) => o.toLowerCase().includes(confCorrect) || o.toLowerCase().includes(confChosen)
          ))
        ) {
          targetExercises.push(ex);
        }
      }
    } catch { continue; }
  }

  if (targetExercises.length === 0) return null;

  // Take up to 3 most relevant exercises
  const selected = targetExercises.slice(0, 3);
  const microId = `micro_${confusion.correct}_vs_${confusion.chosen_instead}`
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 60);

  const micro: Lesson = {
    id: microId,
    topic: confusion.topic,
    category: 'grammar',
    title: `⚠️ Point faible : ${confusion.correct} vs ${confusion.chosen_instead}`,
    difficulty_level: 3,
    created_at: new Date().toISOString().slice(0, 10),
    status: 'approved',
    subtopic: `Confusion fréquente (${confusion.count} fois) — entraînement ciblé`,
    rules: {
      explanation_fr: `Tu confonds souvent « ${confusion.correct} » avec « ${confusion.chosen_instead} ».\n\nCe mini-drill de ${selected.length} exercices est conçu pour renforcer cette distinction précise. Concentre-toi sur la différence.`,
      table: [],
      notes_fr: [
        `⚠️ Tu as confondu « ${confusion.correct} » et « ${confusion.chosen_instead} » ${confusion.count} fois.`,
        `💡 Ces exercices viennent directement de tes leçons — reprends les explications si nécessaire.`,
      ],
    },
    exercises: selected.map((ex, i) => ({ ...ex, id: `${microId}_ex${i + 1}`, phase: 2 })),
  };

  await writeFile(path.join(APPROVED, `${microId}.json`), JSON.stringify(micro, null, 2));
  return micro;
}
