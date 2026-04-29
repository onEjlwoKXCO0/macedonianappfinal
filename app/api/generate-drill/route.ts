import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { Lesson, Exercise } from '@/lib/types';

const APPROVED = path.join(process.cwd(), 'data', 'approved');

interface DrillRequest {
  topic?: string;
  wrongExerciseIds?: string[];
  confusions?: { correct: string; wrong: string }[];
  count?: number;
  hardOnly?: boolean; // phase-3 exercises only, spread across all topics
}

export async function POST(req: NextRequest) {
  const body: DrillRequest = await req.json().catch(() => ({}));
  const { topic, wrongExerciseIds = [], confusions = [], count = 10, hardOnly = false } = body;

  try {
    const files = await readdir(APPROVED);
    const allLessons: Lesson[] = [];
    for (const f of files.filter((f) => f.endsWith('.json') && !f.startsWith('drill_'))) {
      const l: Lesson = JSON.parse(await readFile(path.join(APPROVED, f), 'utf-8'));
      allLessons.push(l);
    }

    let selected: Array<{ exercise: Exercise; lesson: Lesson }>;

    if (hardOnly) {
      // Phase-3 only, shuffled across all topics for variety
      const phase3 = allLessons.flatMap((lesson) =>
        lesson.exercises
          .filter((ex) => ex.phase === 3)
          .map((exercise) => ({ exercise, lesson }))
      );
      // Shuffle and take `count`
      selected = phase3
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
    } else {
      // Score-based selection (error history + topic targeting)
      const scored: Array<{ exercise: Exercise; lesson: Lesson; score: number }> = [];

      for (const lesson of allLessons) {
        for (const ex of lesson.exercises) {
          let score = 0;
          if (wrongExerciseIds.includes(ex.id)) score += 100;
          if (topic && lesson.topic === topic) score += 50;
          for (const { correct, wrong } of confusions) {
            const text = JSON.stringify(ex).toLowerCase();
            if (text.includes(correct.toLowerCase()) || text.includes(wrong.toLowerCase())) score += 30;
          }
          if (ex.phase === 1 && ex.type === 'multiple_choice') score -= 10;
          score += ex.phase * 5;
          if (score > 0) scored.push({ exercise: ex, lesson, score });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      selected = scored.slice(0, count);
    }

    if (selected.length === 0) {
      return NextResponse.json({ error: "Pas assez d'exercices trouvés pour ce drill." }, { status: 404 });
    }

    const drillId = `drill_${Date.now()}`;
    const topicLabel = topic ?? (selected[0]?.lesson.topic ?? 'mixed');

    const drill: Lesson = {
      id: drillId,
      topic: topicLabel,
      category: 'grammar',
      title: hardOnly
        ? '🔥 Défi ultime — Phase 3 uniquement'
        : topic
        ? `⚡ Drill ciblé — ${topic.replace(/_/g, ' ')}`
        : '⚡ Drill personnalisé basé sur vos erreurs',
      difficulty_level: hardOnly ? 5 : 3,
      created_at: new Date().toISOString().slice(0, 10),
      status: 'approved',
      subtopic: hardOnly
        ? `${selected.length} exercices phase 3 — le plus difficile`
        : `${selected.length} exercices sélectionnés d'après votre historique`,
      rules: {
        explanation_fr: hardOnly
          ? 'Exercices de niveau maximal (phase 3) tirés au hasard dans tous les topics. Aucune aide — production libre uniquement.'
          : topic
          ? `Exercices ciblés sur le topic : ${topic.replace(/_/g, ' ')}.`
          : "Exercices générés d'après votre historique d'erreurs.",
        table: [],
        notes_fr: hardOnly
          ? ['🔥 Phase 3 = production libre sans indices. Concentrez-vous sur la précision.']
          : ['💡 Prenez le temps de relire les explications de chaque exercice.'],
      },
      exercises: selected.map(({ exercise }, i) => ({
        ...exercise,
        id: `${drillId}_ex${i + 1}`,
        phase: hardOnly ? 3 : (Math.max(2, exercise.phase) as 1 | 2 | 3),
      })),
    };

    await writeFile(path.join(APPROVED, `${drillId}.json`), JSON.stringify(drill, null, 2));
    return NextResponse.json({ drillId, count: drill.exercises.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
