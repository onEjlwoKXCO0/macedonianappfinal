'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise, Lesson } from '@/lib/types';
import { evaluateExercise } from '@/lib/exercise-evaluator';
import { getProgress, saveProgress, recordExerciseResult, recordSession } from '@/lib/progress-tracker';
import { applyLevelProgression } from '@/lib/difficulty-engine';
import { recordWrongAnswer, getForcedDistractors } from '@/lib/distractor-engine';
import { addOrUpdateWeakItem, ensureCardsForLesson } from '@/lib/spaced-repetition';
import { pushProgress, pushAllCards } from '@/lib/sync';
import RuleExplanation from './RuleExplanation';
import ExerciseRenderer from './ExerciseRenderer';
import ConjugationPanel from './ConjugationPanel';
import InlineEditor from './InlineEditor';

type Screen = 'rules' | 'exercises' | 'results';

interface ExResult {
  exercise: Exercise;
  userAnswer: string;
  correct: boolean;
  explanation_fr: string;
  common_mistakes_fr: string[];
  correctAnswer: string;
}

interface Props {
  lesson: Lesson;
  onFinish?: (score: number, total: number) => void;
  onNextLesson?: () => void;
  onHome?: () => void;
}

export default function LessonFlow({ lesson: initialLesson, onFinish, onNextLesson, onHome }: Props) {
  const [lesson, setLesson] = useState(initialLesson);
  const [screen, setScreen] = useState<Screen>('rules');
  const [exIndex, setExIndex] = useState(0);
  const [results, setResults] = useState<ExResult[]>([]);
  const [conjOpen, setConjOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorExId, setEditorExId] = useState<string | undefined>();
  const [flashClass, setFlashClass] = useState('');
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<ExResult | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [startTime] = useState(Date.now());

  const exercises = lesson.exercises;
  const current = exercises[exIndex];
  const today = new Date().toISOString().slice(0, 10);

  const handleAnswer = useCallback(
    (userAnswer: string | string[] | Record<string, string>) => {
      if (answered) return;
      const evaluation = evaluateExercise(current, userAnswer);
      const result: ExResult = {
        exercise: current,
        userAnswer: evaluation.userAnswer,
        correct: evaluation.correct,
        explanation_fr: evaluation.explanation_fr,
        common_mistakes_fr: evaluation.common_mistakes_fr,
        correctAnswer: evaluation.correctAnswer,
      };
      setLastResult(result);
      setAnswered(true);

      setFlashClass(evaluation.correct ? 'animate-flash-green' : 'animate-flash-red animate-shake');
      setTimeout(() => setFlashClass(''), 700);

      if (!evaluation.correct && current.type === 'multiple_choice') {
        recordWrongAnswer(current.correct_answer, evaluation.userAnswer, lesson.topic, current.type, lesson.id);
      }

      let progress = getProgress();
      progress = {
        ...progress,
        weak_items: addOrUpdateWeakItem(progress.weak_items, current.id, lesson.id, lesson.topic, evaluation.correct, today),
      };
      progress = recordExerciseResult(progress, lesson.topic, evaluation.correct, today);
      saveProgress(progress);
    },
    [answered, current, lesson, today]
  );

  const handleNext = useCallback(() => {
    if (!lastResult) return;
    setResults((prev) => [...prev, lastResult]);
    setLastResult(null);
    setAnswered(false);

    if (exIndex + 1 >= exercises.length) {
      const score = results.filter((r) => r.correct).length + (lastResult.correct ? 1 : 0);
      const total = exercises.length;
      const pct = Math.round((score / total) * 100);
      const elapsed = Math.round((Date.now() - startTime) / 60000);
      let progress = getProgress();
      progress = recordSession(progress, {
        date: today,
        duration_minutes: elapsed,
        lessons_completed: [lesson.id],
        exercises_done: total,
        exercises_correct: score,
        topics_practiced: [lesson.topic],
      });
      saveProgress(progress);
      applyLevelProgression(lesson.topic, pct);
      ensureCardsForLesson(lesson.id, lesson.topic, exercises.map((e) => e.id), today);
      // Background sync — fire-and-forget, does not block the UI
      void Promise.all([pushProgress(), pushAllCards()]);
      onFinish?.(score, total);
      setScreen('results');
    } else {
      setExIndex((i) => i + 1);
      setAnimKey((k) => k + 1);
    }
  }, [lastResult, exIndex, exercises.length, results, lesson, today, startTime, onFinish]);

  const allResults = screen === 'results'
    ? [...results, lastResult].filter(Boolean) as ExResult[]
    : results;

  const score = allResults.filter((r) => r.correct).length;

  const forcedDistractors = current
    ? getForcedDistractors(current.correct_answer).map((c) => c.chosen_instead)
    : [];

  const openEditor = (exId?: string) => { setEditorExId(exId); setEditorOpen(true); };

  return (
    <div
      className="max-w-[680px] mx-auto px-4 py-4"
      style={{ paddingBottom: screen === 'exercises' ? '6rem' : '2rem' }}
    >
      {/* Rules screen */}
      {screen === 'rules' && (
        <RuleExplanation rules={lesson.rules} onStart={() => setScreen('exercises')} />
      )}

      {/* Exercises screen */}
      {screen === 'exercises' && current && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-[var(--text-muted)]">
              Exercice {exIndex + 1} / {exercises.length}
            </div>
            <div className="flex-1 mx-4">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(exIndex / exercises.length) * 100}%`, background: 'var(--accent-blue)' }}
                />
              </div>
            </div>
          </div>

          {/* Exercise card — slides in from the right on each new question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={animKey}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
              className={`card p-6 mb-4 ${flashClass}`}
            >
              <ExerciseRenderer
                exercise={current}
                forcedDistractors={forcedDistractors}
                onAnswer={handleAnswer}
                disabled={answered}
              />
            </motion.div>
          </AnimatePresence>

          {/* Feedback — springs up when answer is submitted */}
          {answered && lastResult && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="card p-5 mb-4"
              style={{ border: `1px solid ${lastResult.correct ? 'var(--accent-green)' : 'var(--accent-red)'}` }}
            >
              <div
                className="font-bold mb-2"
                style={{ color: lastResult.correct ? 'var(--accent-green)' : 'var(--accent-red)' }}
              >
                {lastResult.correct ? '✅ Correct !' : '❌ Incorrect'}
              </div>
              {!lastResult.correct && (
                <div className="mb-2">
                  <span className="text-[var(--text-muted)] text-sm">Réponse correcte : </span>
                  <span className="mk-text text-base">{lastResult.correctAnswer}</span>
                </div>
              )}
              <p className="text-[0.9rem] leading-relaxed mb-2">{lastResult.explanation_fr}</p>
              {!lastResult.correct && lastResult.common_mistakes_fr.length > 0 && (
                <ul className="list-none p-0 m-0 text-[0.85rem] text-[var(--text-muted)]">
                  {lastResult.common_mistakes_fr.map((m, i) => (
                    <li key={`${m}_${i}`}>• {m}</li>
                  ))}
                </ul>
              )}
              <button onClick={handleNext} className="btn-primary mt-4 w-full">
                {exIndex + 1 >= exercises.length ? 'Voir les résultats →' : 'Exercice suivant →'}
              </button>
            </motion.div>
          )}

          {/* Floating action buttons */}
          <div className="fab-group">
            <button className="fab" title="Règles" onClick={() => setScreen('rules')}>📖</button>
            <button className="fab" title="Tables" onClick={() => setConjOpen(true)}>📋</button>
            <button className="fab" title="Modifier" onClick={() => openEditor(current.id)}>✏️</button>
          </div>
        </>
      )}

      {/* Results screen */}
      {screen === 'results' && (
        <div>
          <div className="card p-8 text-center mb-6">
            <div className="text-5xl mb-2">
              {score / exercises.length >= 0.8 ? '🏆' : score / exercises.length >= 0.5 ? '📘' : '📚'}
            </div>
            <h2 className="text-[2rem] font-extrabold mb-2">
              {score} / {exercises.length}
            </h2>
            <div className="stars">
              {[1, 2, 3].map((s) => (
                <span key={s} className={`star ${score / exercises.length >= s / 3 ? 'filled' : 'empty'}`}>★</span>
              ))}
            </div>
            <p className="text-[var(--text-muted)] mt-3">
              {score / exercises.length >= 0.8
                ? 'Excellent travail !'
                : score / exercises.length >= 0.5
                ? 'Bon travail, continuez !'
                : 'Révisez les points difficiles !'}
            </p>
          </div>

          {allResults.map((r) => (
            <div
              key={r.exercise.id}
              className="card p-5 mb-3"
              style={{ border: `1px solid ${r.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="mr-2">{r.correct ? '✅' : '❌'}</span>
                  <span className="text-[0.8rem] text-[var(--text-muted)]">{r.exercise.type}</span>
                  {r.correct ? (
                    <div className="mt-1 text-[0.9rem]">
                      Votre réponse : <span className="text-[var(--accent-green)]">{r.userAnswer}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="mt-1 text-[0.9rem]">
                        Votre réponse : <span className="text-[var(--accent-red)]">{r.userAnswer}</span>
                      </div>
                      <div className="text-[0.9rem] mt-[0.15rem]">
                        Correct : <span className="font-semibold text-[var(--accent-green)]">{r.correctAnswer}</span>
                      </div>
                      <p className="text-[0.85rem] text-[var(--text-muted)] mt-2 leading-normal">
                        {r.explanation_fr}
                      </p>
                      {r.common_mistakes_fr.length > 0 && (
                        <ul className="list-none p-0 m-0 mt-[0.35rem] text-[0.8rem] text-[var(--text-muted)]">
                          {r.common_mistakes_fr.map((m, i) => (
                            <li key={`${m}_${i}`}>• {m}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEditor(r.exercise.id)}
                  className="btn-ghost shrink-0 text-xs"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  ✏️
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-3 flex-wrap mt-4">
            <button
              onClick={() => { setScreen('exercises'); setExIndex(0); setResults([]); setLastResult(null); setAnswered(false); }}
              className="btn-secondary flex-1"
            >
              🔄 Refaire
            </button>
            {onNextLesson && (
              <button onClick={onNextLesson} className="btn-primary flex-1">📘 Leçon suivante</button>
            )}
            {onHome && (
              <button onClick={onHome} className="btn-secondary flex-1">🏠 Accueil</button>
            )}
          </div>
        </div>
      )}

      {/* Panels */}
      <ConjugationPanel
        open={conjOpen}
        onClose={() => setConjOpen(false)}
        verbs={current?.verbs_present ?? []}
        currentSentence={current?.sentence ?? current?.sentence_mk ?? current?.sentence_fr ?? ''}
      />

      {editorOpen && (
        <InlineEditor
          lesson={lesson}
          exerciseId={editorExId}
          onClose={() => setEditorOpen(false)}
          onSaved={(updated) => { setLesson(updated); setEditorOpen(false); }}
        />
      )}
    </div>
  );
}
