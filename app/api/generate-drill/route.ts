import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { Lesson, Exercise } from '@/lib/types';

const APPROVED = path.join(process.cwd(), 'data', 'approved');

interface DrillRequest {
  topic?: string;           // drill for a specific topic
  wrongExerciseIds?: string[]; // target specific failing exercises
  confusions?: { correct: string; wrong: string }[]; // distractor confusions
  count?: number;           // number of exercises to include
}

export async function POST(req: NextRequest) {
  const body: DrillRequest = await req.json().catch(() => ({}));
  const { topic, wrongExerciseIds = [], confusions = [], count = 8 } = body;

  try {
    const files = await readdir(APPROVED);
    const allLessons: Lesson[] = [];
    for (const f of files.filter((f) => f.endsWith('.json') && !f.startsWith('drill_'))) {
      const l: Lesson = JSON.parse(await readFile(path.join(APPROVED, f), 'utf-8'));
      allLessons.push(l);
    }

    const scored: Array<{ exercise: Exercise; lesson: Lesson; score: number }> = [];

    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        let score = 0;

        // Prioritise wrong exercises
        if (wrongExerciseIds.includes(ex.id)) score += 100;

        // Prioritise topic
        if (topic && lesson.topic === topic) score += 50;

        // Prioritise exercises involving confused words
        for (const { correct, wrong } of confusions) {
          const text = JSON.stringify(ex).toLowerCase();
          if (text.includes(correct.toLowerCase()) || text.includes(wrong.toLowerCase())) {
            score += 30;
          }
        }

        // Avoid trivial phase-1 multiple choice for drills
        if (ex.phase === 1 && ex.type === 'multiple_choice') score -= 10;

        // Prefer higher phases for drilling
        score += ex.phase * 5;

        if (score > 0) scored.push({ exercise: ex, lesson, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, count);

    if (selected.length === 0) {
      return NextResponse.json({ error: 'Pas assez d\'exercices trouvés pour ce drill.' }, { status: 404 });
    }

    const drillId = `drill_${Date.now()}`;
    const topicLabel = topic ?? (selected[0]?.lesson.topic ?? 'mixed');

    const drill: Lesson = {
      id: drillId,
      topic: topicLabel,
      category: 'grammar',
      title: topic
        ? `⚡ Drill ciblé — ${topic.replace(/_/g, ' ')}`
        : '⚡ Drill personnalisé basé sur vos erreurs',
      difficulty_level: 3,
      created_at: new Date().toISOString().slice(0, 10),
      status: 'approved',
      subtopic: `${selected.length} exercices sélectionnés d'après votre historique`,
      rules: {
        explanation_fr: topic
          ? `Exercices ciblés sur le topic : ${topic.replace(/_/g, ' ')}. Ces exercices ont été sélectionnés pour renforcer vos points faibles.`
          : 'Ces exercices ont été générés automatiquement d\'après votre historique d\'erreurs. Concentrez-vous sur la compréhension, pas sur la vitesse.',
        table: [],
        notes_fr: ['💡 Prenez le temps de relire les explications de chaque exercice.'],
      },
      exercises: selected.map(({ exercise }, i) => ({
        ...exercise,
        id: `${drillId}_ex${i + 1}`,
        phase: Math.max(2, exercise.phase) as 1 | 2 | 3,
      })),
    };

    await writeFile(path.join(APPROVED, `${drillId}.json`), JSON.stringify(drill, null, 2));

    return NextResponse.json({ drillId, count: drill.exercises.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
