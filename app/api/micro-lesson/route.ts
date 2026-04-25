import { NextRequest, NextResponse } from 'next/server';
import { generateMicroLesson } from '@/lib/micro-lesson-generator';
import type { Confusion, DistractorMemory } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { confusion, distractorMemory } = await req.json() as {
      confusion: Confusion;
      distractorMemory: DistractorMemory;
    };

    if (distractorMemory.micro_lessons_injected.includes(
      `micro_${confusion.correct}_vs_${confusion.chosen_instead}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60)
    )) {
      return NextResponse.json({ alreadyInjected: true });
    }

    const micro = await generateMicroLesson(confusion);
    if (!micro) return NextResponse.json({ generated: false });

    return NextResponse.json({ generated: true, lessonId: micro.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
