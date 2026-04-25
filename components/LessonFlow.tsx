'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Exercise, Lesson } from '@/lib/types';
import { evaluateExercise } from '@/lib/exercise-evaluator';
import { getProgress, saveProgress, recordExerciseResult, recordSession } from '@/lib/progress-tracker';
import { applyLevelProgression } from '@/lib/difficulty-engine';
import { recordWrongAnswer, getForcedDistractors } from '@/lib/distractor-engine';
import { addOrUpdateWeakItem } from '@/lib/spaced-repetition';
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

      // Flash animation
      setFlashClass(evaluation.correct ? 'animate-flash-green' : 'animate-flash-red animate-shake');
      setTimeout(() => setFlashClass(''), 700);

      // Record distractor
      if (!evaluation.correct && current.type === 'multiple_choice') {
        recordWrongAnswer(
          current.correct_answer,
          evaluation.userAnswer,
          lesson.topic,
          current.type,
          lesson.id
        );
      }

      // Update spaced repetition
      let progress = getProgress();
      progress = {
        ...progress,
        weak_items: addOrUpdateWeakItem(
          progress.weak_items,
          current.id,
          lesson.id,
          lesson.topic,
          evaluation.correct,
          today
        ),
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
      // Done — record session & level progression
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

  const openEditor = (exId?: string) => {
    setEditorExId(exId);
    setEditorOpen(true);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1rem', paddingBottom: screen === 'exercises' ? '6rem' : '2rem' }}>
      {/* Rules screen */}
      {screen === 'rules' && (
        <RuleExplanation rules={lesson.rules} onStart={() => setScreen('exercises')} />
      )}

      {/* Exercises screen */}
      {screen === 'exercises' && current && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Exercice {exIndex + 1} / {exercises.length}
            </div>
            <div style={{ flex: 1, margin: '0 1rem' }}>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${((exIndex) / exercises.length) * 100}%`, background: 'var(--accent-blue)' }} />
              </div>
            </div>
          </div>

          {/* Exercise card */}
          <div key={animKey} className={`card slide-enter ${flashClass}`} style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <ExerciseRenderer
              exercise={current}
              forcedDistractors={forcedDistractors}
              onAnswer={handleAnswer}
              disabled={answered}
            />
          </div>

          {/* Feedback after answering */}
          {answered && lastResult && (
            <div
              className="card"
              style={{
                padding: '1.25rem',
                marginBottom: '1rem',
                border: `1px solid ${lastResult.correct ? 'var(--accent-green)' : 'var(--accent-red)'}`,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: lastResult.correct ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {lastResult.correct ? '✅ Correct !' : '❌ Incorrect'}
              </div>
              {!lastResult.correct && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Réponse correcte : </span>
                  <span className="mk-text" style={{ fontSize: '1rem' }}>{lastResult.correctAnswer}</span>
                </div>
              )}
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>{lastResult.explanation_fr}</p>
              {!lastResult.correct && lastResult.common_mistakes_fr.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {lastResult.common_mistakes_fr.map((m, i) => <li key={i}>• {m}</li>)}
                </ul>
              )}
              <button onClick={handleNext} className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {exIndex + 1 >= exercises.length ? 'Voir les résultats →' : 'Exercice suivant →'}
              </button>
            </div>
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
          <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              {score / exercises.length >= 0.8 ? '🏆' : score / exercises.length >= 0.5 ? '📘' : '📚'}
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              {score} / {exercises.length}
            </h2>
            <div className="stars">
              {[1, 2, 3].map((s) => (
                <span key={s} className={`star ${score / exercises.length >= s / 3 ? 'filled' : 'empty'}`}>★</span>
              ))}
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              {score / exercises.length >= 0.8 ? 'Excellent travail !' : score / exercises.length >= 0.5 ? 'Bon travail, continuez !' : 'Révisez les points difficiles !'}
            </p>
          </div>

          {allResults.map((r, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: '1.25rem', marginBottom: '0.75rem',
                border: `1px solid ${r.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ marginRight: '0.5rem' }}>{r.correct ? '✅' : '❌'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.exercise.type}</span>
                  {r.correct ? (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                      Votre réponse : <span style={{ color: 'var(--accent-green)' }}>{r.userAnswer}</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Votre réponse : <span style={{ color: 'var(--accent-red)' }}>{r.userAnswer}</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>
                        Correct : <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{r.correctAnswer}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                        {r.explanation_fr}
                      </p>
                      {r.common_mistakes_fr.length > 0 && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {r.common_mistakes_fr.map((m, mi) => <li key={mi}>• {m}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEditor(r.exercise.id)}
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', flexShrink: 0 }}
                >
                  ✏️
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button
              onClick={() => { setScreen('exercises'); setExIndex(0); setResults([]); setLastResult(null); setAnswered(false); }}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              🔄 Refaire
            </button>
            {onNextLesson && (
              <button onClick={onNextLesson} className="btn-primary" style={{ flex: 1 }}>
                📘 Leçon suivante
              </button>
            )}
            {onHome && (
              <button onClick={onHome} className="btn-secondary" style={{ flex: 1 }}>
                🏠 Accueil
              </button>
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
