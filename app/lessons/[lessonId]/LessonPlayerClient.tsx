'use client';
import { useRouter } from 'next/navigation';
import type { Lesson } from '@/lib/types';
import LessonFlow from '@/components/LessonFlow';

export default function LessonPlayerClient({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  return (
    <LessonFlow
      lesson={lesson}
      onFinish={() => {}}
      onHome={() => router.push('/')}
      onNextLesson={() => router.push('/lessons')}
    />
  );
}
