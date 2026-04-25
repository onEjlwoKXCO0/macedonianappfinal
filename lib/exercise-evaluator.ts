import { answersMatch } from './romanization-normalizer';
import type { Exercise } from './types';

export interface EvaluationResult {
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation_fr: string;
  common_mistakes_fr: string[];
}

export function evaluateExercise(
  exercise: Exercise,
  userAnswer: string | string[] | Record<string, string>
): EvaluationResult {
  const base = {
    correctAnswer: exercise.correct_answer,
    explanation_fr: exercise.explanation_fr,
    common_mistakes_fr: exercise.common_mistakes_fr,
  };

  switch (exercise.type) {
    case 'multiple_choice':
    case 'translate_to_fr':
    case 'error_correction':
    case 'spot_the_difference': {
      const answer = String(userAnswer);
      return {
        ...base,
        correct: answersMatch(answer, exercise.correct_answer, exercise.accept_alternatives),
        userAnswer: answer,
      };
    }

    case 'fill_blank':
    case 'translate_to_mk':
    case 'transformation': {
      const answer = String(userAnswer);
      return {
        ...base,
        correct: answersMatch(answer, exercise.correct_answer, exercise.accept_alternatives),
        userAnswer: answer,
      };
    }

    case 'sentence_builder': {
      const answer = Array.isArray(userAnswer) ? (userAnswer as string[]).join(' ') : String(userAnswer);
      return {
        ...base,
        correct: answersMatch(answer, exercise.correct_answer, exercise.accept_alternatives),
        userAnswer: answer,
      };
    }

    case 'matching': {
      // userAnswer is Record<string, string> mapping mk → fr
      const pairs = exercise.pairs ?? [];
      const userPairs = userAnswer as Record<string, string>;
      const allCorrect = pairs.every(
        (p) => answersMatch(userPairs[p.mk] ?? '', p.fr, [])
      );
      const userDesc = pairs.map((p) => `${p.mk} → ${userPairs[p.mk] ?? '?'}`).join(', ');
      return {
        ...base,
        correct: allCorrect,
        userAnswer: userDesc,
        correctAnswer: pairs.map((p) => `${p.mk} → ${p.fr}`).join(', '),
      };
    }

    case 'transformation_chain': {
      const steps = exercise.steps ?? [];
      const userSteps = Array.isArray(userAnswer) ? (userAnswer as string[]) : [];
      const allCorrect = steps.every((step, i) =>
        answersMatch(userSteps[i] ?? '', step.expected_answer, [])
      );
      return {
        ...base,
        correct: allCorrect,
        userAnswer: userSteps.join(' → '),
        correctAnswer: steps.map((s) => s.expected_answer).join(' → '),
      };
    }

    default: {
      const answer = String(userAnswer);
      return {
        ...base,
        correct: answersMatch(answer, exercise.correct_answer, exercise.accept_alternatives),
        userAnswer: answer,
      };
    }
  }
}
