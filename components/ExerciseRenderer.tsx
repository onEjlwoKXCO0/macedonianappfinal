'use client';
import { useState, useRef } from 'react';
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
    <div className="flex flex-col gap-3">
      <p className="mk-text mb-2 text-xl">{exercise.question}</p>
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

// ─── Text Input ────────────────────────────────────────────────────────────────

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
        <p className="mk-text mb-4 text-xl leading-relaxed">
          {parts[0]}
          <span
            className="inline-block min-w-[80px] mx-1"
            style={{ borderBottom: '2px solid var(--accent-blue)' }}
          >
            {submitted ? (
              <span style={{ color: answersMatch(value, exercise.correct_answer, exercise.accept_alternatives) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {value || '?'}
              </span>
            ) : value || '        '}
          </span>
          {parts[1]}
        </p>
      );
    }
    if (exercise.type === 'translate_to_mk') {
      return <p className="mb-4 text-[var(--text-muted)] text-[1.1rem]">{sentence}</p>;
    }
    if (exercise.type === 'translate_to_fr') {
      return <p className="mk-text mb-4 text-xl">{sentence}</p>;
    }
    if (exercise.type === 'error_correction') {
      return (
        <div className="mb-4">
          <p className="mk-text text-xl" style={{ textDecoration: 'underline wavy var(--accent-red)' }}>{sentence}</p>
          <p className="text-[0.8rem] text-[var(--text-muted)] mt-2">Cette phrase contient une erreur. Écris la version correcte.</p>
        </div>
      );
    }
    if (exercise.type === 'transformation') {
      return (
        <div className="mb-4">
          <p className="mk-text text-xl">{sentence}</p>
          {exercise.transformation_instruction_fr && (
            <p className="text-[0.9rem] mt-2 text-[var(--accent-blue)]">
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
          className="btn-primary mt-3 w-full"
          onClick={handleSubmit}
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
  const [frItems] = useState<string[]>(() =>
    [...pairs.map((p) => p.fr)].sort(() => Math.random() - 0.5)
  );

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
      if (Object.keys(newMatched).length === pairs.length) onAnswer(newMatched);
    } else {
      setWrongFlash(fr);
      setTimeout(() => setWrongFlash(null), 600);
      setSelectedMk(null);
    }
  };

  const frUsed = Object.values(matched);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2">
        <div className="text-xs text-[var(--text-muted)] font-semibold px-1 mb-1">Macédonien</div>
        {mkItems.map((mk) => (
          <button
            key={mk}
            className={`match-item${selectedMk === mk ? ' selected' : ''}${matched[mk] ? ' matched-correct' : ''}`}
            onClick={() => handleMk(mk)}
          >
            <span className="mk-text text-base">{mk}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-xs text-[var(--text-muted)] font-semibold px-1 mb-1">Français</div>
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
      <div
        className="min-h-[60px] p-3 rounded-lg mb-4 flex flex-wrap gap-2 items-center border-2 border-[var(--border)] bg-[var(--bg-input)]"
      >
        {placed.length === 0 && (
          <span className="text-[var(--text-muted)] text-sm">Construisez la phrase ici...</span>
        )}
        {placed.map((w, i) => (
          <span key={`${w}_${i}`} className="word-chip placed text-base" style={{ padding: '0.3rem 0.6rem' }}>{w}</span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {shuffled.map((word, i) => (
          <button
            key={`${word}_${i}`}
            className={`word-chip${usedIndices.has(i) ? ' used' : ''} text-base`}
            style={{ padding: '0.4rem 0.75rem' }}
            onClick={() => handleAdd(word, i)}
          >
            {word}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-center mt-1">
        {placed.length > 0 && !submitted && (
          <button className="btn-ghost text-sm" onClick={handleRemoveLast}>
            ← Effacer dernier mot
          </button>
        )}
        {placed.length > 0 && !submitted && (
          <button className="btn-primary flex-1" onClick={handleSubmit}>Valider</button>
        )}
      </div>
    </div>
  );
}

// ─── Spot the Difference ──────────────────────────────────────────────────────

function SpotTheDifference({ exercise, onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keywords = exercise.expected_keywords_fr ?? [];

  const handle = (choice: string) => {
    if (selected || disabled) return;
    setSelected(choice);
    onAnswer(choice);
  };

  return (
    <div>
      <p className="text-[var(--text-muted)] text-[0.9rem] mb-4">
        Quelle différence y a-t-il entre ces deux phrases ?
      </p>
      <div className="flex flex-col gap-3 mb-5">
        <div className="card p-4">
          <span className="text-[0.7rem] text-[var(--text-muted)] font-semibold">A</span>
          <p className="mk-text text-lg mt-1">{exercise.sentence_a}</p>
        </div>
        <div className="card p-4">
          <span className="text-[0.7rem] text-[var(--text-muted)] font-semibold">B</span>
          <p className="mk-text text-lg mt-1">{exercise.sentence_b}</p>
        </div>
      </div>
      {keywords.length > 0 && (
        <p className="text-[0.75rem] text-[var(--text-muted)] mb-3">
          Indices : {keywords.map((kw, i) => (
            <span key={i} className="inline-block bg-[var(--surface-2)] rounded px-1.5 py-0.5 mr-1 mb-1">{kw}</span>
          ))}
        </p>
      )}
      <input
        ref={inputRef}
        className="input-mk"
        style={{ fontSize: '1rem' }}
        placeholder="Décrivez la différence en français..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') handle((e.target as HTMLInputElement).value);
        }}
        disabled={!!selected || disabled}
      />
      {!selected && (
        <button
          className="btn-primary mt-3 w-full"
          onClick={() => {
            if (inputRef.current?.value) handle(inputRef.current.value);
          }}
        >
          Valider
        </button>
      )}
    </div>
  );
}

// ─── Transformation Chain ─────────────────────────────────────────────────────

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
      <div className="card p-4 mb-4">
        <span className="text-xs text-[var(--text-muted)] font-semibold">Phrase de départ</span>
        <p className="mk-text text-lg mt-1">{exercise.base_sentence}</p>
      </div>
      {answers.map((ans, i) => (
        <div
          key={`step_${i}`}
          className="px-4 py-2 mb-2 rounded-lg text-[0.9rem]"
          style={{ background: 'rgba(34,197,94,0.1)' }}
        >
          <span className="text-[var(--text-muted)]">Étape {i + 1}: </span>{ans}
        </div>
      ))}
      {currentStep < steps.length && (
        <div>
          <p className="text-[0.9rem] mb-3 text-[var(--accent-blue)]">
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
          <button className="btn-primary mt-3 w-full" onClick={handleStep}>
            Étape suivante →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Dispatcher ──────────────────────────────────────────────────────────

export default function ExerciseRenderer(props: Props) {
  const { exercise } = props;

  return (
    <div>
      <div className="mb-4">
        <span className={`badge phase-${exercise.phase} mb-2 inline-block`}>
          Phase {exercise.phase} — {exercise.phase === 1 ? 'Guidé' : exercise.phase === 2 ? 'Difficile' : 'Chaos'}
        </span>
        <p className="text-base text-[var(--text-muted)] mt-2">{exercise.instruction_fr}</p>
      </div>
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
