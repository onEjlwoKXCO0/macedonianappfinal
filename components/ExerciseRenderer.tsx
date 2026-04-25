'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Exercise } from '@/lib/types';
import { answersMatch, getHintColor } from '@/lib/romanization-normalizer';
import DistractorBadge from './DistractorBadge';

interface Props {
  exercise: Exercise;
  forcedDistractors?: string[];
  onAnswer: (answer: string | string[] | Record<string, string>) => void;
  disabled?: boolean;
  showResult?: boolean;
  wasCorrect?: boolean;
}

// ─── Multiple Choice ───────────────────────────────────────────────────────────

function MultipleChoice({ exercise, forcedDistractors = [], onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = exercise.options ?? [];

  const handleSelect = (opt: string) => {
    if (disabled || selected) return;
    setSelected(opt);
    onAnswer(opt);
  };

  const getClass = (opt: string) => {
    if (!selected) return 'mc-option';
    if (opt === exercise.correct_answer) return 'mc-option correct';
    if (opt === selected) return 'mc-option wrong';
    return 'mc-option';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p className="mk-text" style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>
        {exercise.question}
      </p>
      {options.map((opt) => (
        <button
          key={opt}
          className={getClass(opt)}
          onClick={() => handleSelect(opt)}
          disabled={!!selected || disabled}
        >
          {opt}
          {forcedDistractors.includes(opt) && <DistractorBadge />}
        </button>
      ))}
    </div>
  );
}

// ─── Text Input (fill_blank / translate_to_mk / transformation) ────────────────

function TextInput({ exercise, onAnswer, disabled }: Props) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const hint = getHintColor(value, exercise.correct_answer, exercise.accept_alternatives);
  const hintClass = hint === 'green' ? 'hint-green' : hint === 'orange' ? 'hint-orange' : '';

  const sentence = exercise.sentence ?? exercise.sentence_fr ?? exercise.sentence_mk ?? '';

  const handleSubmit = () => {
    if (!value.trim() || submitted || disabled) return;
    setSubmitted(true);
    onAnswer(value.trim());
  };

  const renderSentence = () => {
    if (exercise.type === 'fill_blank' && sentence.includes('___')) {
      const parts = sentence.split('___');
      return (
        <p className="mk-text" style={{ marginBottom: '1rem', fontSize: '1.25rem', lineHeight: 1.6 }}>
          {parts[0]}
          <span style={{ display: 'inline-block', minWidth: 80, borderBottom: '2px solid var(--accent-blue)', margin: '0 4px' }}>
            {submitted ? (
              <span style={{ color: answersMatch(value, exercise.correct_answer, exercise.accept_alternatives) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {value || '?'}
              </span>
            ) : value || '        '}
          </span>
          {parts[1]}
        </p>
      );
    }
    if (exercise.type === 'translate_to_mk') {
      return <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>{sentence}</p>;
    }
    if (exercise.type === 'translate_to_fr') {
      return <p className="mk-text" style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{sentence}</p>;
    }
    if (exercise.type === 'error_correction') {
      return (
        <div style={{ marginBottom: '1rem' }}>
          <p className="mk-text" style={{ fontSize: '1.25rem', textDecoration: 'underline wavy var(--accent-red)' }}>{sentence}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cette phrase contient une erreur. Écris la version correcte.</p>
        </div>
      );
    }
    if (exercise.type === 'transformation') {
      return (
        <div style={{ marginBottom: '1rem' }}>
          <p className="mk-text" style={{ fontSize: '1.25rem' }}>{sentence}</p>
          {exercise.transformation_instruction_fr && (
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', marginTop: '0.5rem' }}>
              → {exercise.transformation_instruction_fr}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {renderSentence()}
      <input
        className={`input-mk ${hintClass}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Votre réponse..."
        disabled={submitted || disabled}
        autoFocus
      />
      {!submitted && (
        <button
          className="btn-primary"
          onClick={handleSubmit}
          style={{ marginTop: '0.75rem', width: '100%' }}
          disabled={!value.trim() || disabled}
        >
          Valider
        </button>
      )}
    </div>
  );
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function Matching({ exercise, onAnswer }: Props) {
  const pairs = exercise.pairs ?? [];
  const mkItems = pairs.map((p) => p.mk);
  const frItems = [...pairs.map((p) => p.fr)].sort(() => Math.random() - 0.5);

  const [selectedMk, setSelectedMk] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);

  const handleMk = (mk: string) => {
    if (matched[mk]) return;
    setSelectedMk((prev) => (prev === mk ? null : mk));
  };

  const handleFr = (fr: string) => {
    if (!selectedMk) return;
    const correct = pairs.find((p) => p.mk === selectedMk)?.fr;
    if (fr === correct) {
      const newMatched = { ...matched, [selectedMk]: fr };
      setMatched(newMatched);
      setSelectedMk(null);
      if (Object.keys(newMatched).length === pairs.length) {
        onAnswer(newMatched);
      }
    } else {
      setWrongFlash(fr);
      setTimeout(() => setWrongFlash(null), 600);
      setSelectedMk(null);
    }
  };

  const frUsed = Object.values(matched);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.25rem', marginBottom: '0.25rem' }}>Macédonien</div>
        {mkItems.map((mk) => (
          <button
            key={mk}
            className={`match-item${selectedMk === mk ? ' selected' : ''}${matched[mk] ? ' matched-correct' : ''}`}
            onClick={() => handleMk(mk)}
          >
            <span className="mk-text" style={{ fontSize: '1rem' }}>{mk}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.25rem', marginBottom: '0.25rem' }}>Français</div>
        {frItems.map((fr) => {
          const isMatched = frUsed.includes(fr);
          return (
            <button
              key={fr}
              className={`match-item${isMatched ? ' matched-correct' : ''}${wrongFlash === fr ? ' matched-wrong' : ''}`}
              onClick={() => !isMatched && handleFr(fr)}
            >
              {fr}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sentence Builder ─────────────────────────────────────────────────────────

function SentenceBuilder({ exercise, onAnswer }: Props) {
  const words = exercise.scrambled_words ?? [];
  const [shuffled] = useState(() => [...words].sort(() => Math.random() - 0.5));
  const [placed, setPlaced] = useState<string[]>([]);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const handleAdd = (word: string, idx: number) => {
    if (usedIndices.has(idx) || submitted) return;
    setPlaced((p) => [...p, word]);
    setUsedIndices((u) => new Set([...u, idx]));
  };

  const handleRemoveLast = () => {
    if (placed.length === 0 || submitted) return;
    const lastWord = placed[placed.length - 1];
    const lastIdx = [...usedIndices].reverse().find((i) => shuffled[i] === lastWord);
    const newUsed = new Set(usedIndices);
    if (lastIdx !== undefined) newUsed.delete(lastIdx);
    setPlaced((p) => p.slice(0, -1));
    setUsedIndices(newUsed);
  };

  const handleSubmit = () => {
    if (placed.length === 0 || submitted) return;
    setSubmitted(true);
    onAnswer(placed);
  };

  return (
    <div>
      <div style={{
        minHeight: 60, padding: '0.75rem', borderRadius: 8,
        border: '2px solid var(--border)', background: 'var(--bg-input)',
        marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center'
      }}>
        {placed.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Construisez la phrase ici...</span>
        )}
        {placed.map((w, i) => (
          <span key={i} className="word-chip placed" style={{ fontSize: '1rem', padding: '0.3rem 0.6rem' }}>{w}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {shuffled.map((word, i) => (
          <button
            key={i}
            className={`word-chip${usedIndices.has(i) ? ' used' : ''}`}
            style={{ fontSize: '1rem', padding: '0.4rem 0.75rem' }}
            onClick={() => handleAdd(word, i)}
          >
            {word}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
        {placed.length > 0 && !submitted && (
          <button className="btn-ghost" onClick={handleRemoveLast} style={{ fontSize: '0.875rem' }}>
            ← Effacer dernier mot
          </button>
        )}
        {placed.length > 0 && !submitted && (
          <button className="btn-primary" onClick={handleSubmit} style={{ flex: 1 }}>
            Valider
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Spot the Difference ──────────────────────────────────────────────────────

function SpotTheDifference({ exercise, onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handle = (choice: string) => {
    if (selected || disabled) return;
    setSelected(choice);
    onAnswer(choice);
  };

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Quelle différence y a-t-il entre ces deux phrases ?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>A</span>
          <p className="mk-text" style={{ fontSize: '1.125rem', marginTop: '0.25rem' }}>{exercise.sentence_a}</p>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>B</span>
          <p className="mk-text" style={{ fontSize: '1.125rem', marginTop: '0.25rem' }}>{exercise.sentence_b}</p>
        </div>
      </div>
      <input
        className="input-mk"
        placeholder="Décrivez la différence en français..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') handle((e.target as HTMLInputElement).value);
        }}
        disabled={!!selected || disabled}
        style={{ fontSize: '1rem' }}
      />
      {!selected && (
        <button
          className="btn-primary"
          style={{ marginTop: '0.75rem', width: '100%' }}
          onClick={(e) => {
            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
            if (input?.value) handle(input.value);
          }}
        >
          Valider
        </button>
      )}
    </div>
  );
}

// ─── Transformation Chain ────────────────────────────────────────────────────

function TransformationChain({ exercise, onAnswer }: Props) {
  const steps = exercise.steps ?? [];
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState('');

  const handleStep = () => {
    if (!inputVal.trim()) return;
    const newAnswers = [...answers, inputVal.trim()];
    setAnswers(newAnswers);
    setInputVal('');
    if (newAnswers.length === steps.length) {
      onAnswer(newAnswers);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Phrase de départ</span>
        <p className="mk-text" style={{ fontSize: '1.125rem', marginTop: '0.25rem' }}>{exercise.base_sentence}</p>
      </div>
      {answers.map((ans, i) => (
        <div key={i} style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem', background: 'rgba(34,197,94,0.1)', borderRadius: 8, fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Étape {i + 1}: </span>{ans}
        </div>
      ))}
      {currentStep < steps.length && (
        <div>
          <p style={{ color: 'var(--accent-blue)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Étape {currentStep + 1}: {steps[currentStep].instruction_fr}
          </p>
          <input
            className="input-mk"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStep()}
            placeholder="Votre réponse..."
            autoFocus
          />
          <button className="btn-primary" onClick={handleStep} style={{ marginTop: '0.75rem', width: '100%' }}>
            Étape suivante →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

export default function ExerciseRenderer(props: Props) {
  const { exercise } = props;

  const renderInstruction = () => (
    <div style={{ marginBottom: '1rem' }}>
      <span className={`badge phase-${exercise.phase}`} style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
        Phase {exercise.phase} — {exercise.phase === 1 ? 'Guidé' : exercise.phase === 2 ? 'Difficile' : 'Chaos'}
      </span>
      <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        {exercise.instruction_fr}
      </p>
    </div>
  );

  return (
    <div>
      {renderInstruction()}
      {exercise.type === 'multiple_choice' && <MultipleChoice {...props} />}
      {(exercise.type === 'fill_blank' || exercise.type === 'translate_to_mk' || exercise.type === 'translate_to_fr' || exercise.type === 'error_correction' || exercise.type === 'transformation') && (
        <TextInput {...props} />
      )}
      {exercise.type === 'matching' && <Matching {...props} />}
      {exercise.type === 'sentence_builder' && <SentenceBuilder {...props} />}
      {exercise.type === 'spot_the_difference' && <SpotTheDifference {...props} />}
      {exercise.type === 'transformation_chain' && <TransformationChain {...props} />}
    </div>
  );
}
