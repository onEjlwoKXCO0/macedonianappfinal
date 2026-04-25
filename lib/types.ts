export type ExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'translate_to_mk'
  | 'translate_to_fr'
  | 'error_correction'
  | 'transformation'
  | 'transformation_chain'
  | 'matching'
  | 'sentence_builder'
  | 'spot_the_difference';

export interface Exercise {
  id: string;
  phase: 1 | 2 | 3;
  type: ExerciseType;
  level: 1 | 2 | 3 | 4 | 5;
  instruction_fr: string;
  correct_answer: string;
  accept_alternatives: string[];
  explanation_fr: string;
  common_mistakes_fr: string[];
  verbs_present: string[];
  cyrillic_original?: string;
  // multiple_choice
  question?: string;
  options?: string[];
  // fill_blank / error_correction / transformation
  sentence?: string;
  transformation_instruction_fr?: string;
  // translate_to_mk
  sentence_fr?: string;
  // translate_to_fr
  sentence_mk?: string;
  // transformation_chain
  base_sentence?: string;
  steps?: { instruction_fr: string; expected_answer: string }[];
  // matching
  pairs?: { mk: string; fr: string }[];
  // sentence_builder
  scrambled_words?: string[];
  // spot_the_difference
  sentence_a?: string;
  sentence_b?: string;
  expected_keywords_fr?: string[];
}

export interface RuleTableRow {
  french: string;
  macedonian: string;
  example_mk: string;
  example_fr: string;
}

export interface LessonRules {
  explanation_fr: string;
  table: RuleTableRow[];
  notes_fr: string[];
  cyrillic_reference?: string;
}

export interface Lesson {
  id: string;
  topic: string;
  category: 'grammar' | 'thematic';
  title: string;
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  created_at: string;
  status: 'approved' | 'pending' | 'rejected';
  subtopic: string;
  rules: LessonRules;
  exercises: Exercise[];
}

export interface TopicProgress {
  current_level: number;
  mastery_percent: number;
  exercises_done: number;
  exercises_correct: number;
  last_practiced: string | null;
  level_scores: Record<string, number[]>;
}

export interface WeakItem {
  item_id: string;
  lesson_id: string;
  topic: string;
  last_wrong: string;
  wrong_count: number;
  next_review: string;
  interval_days: number;
  ease_factor: number;
}

export interface SessionHistory {
  date: string;
  duration_minutes: number;
  lessons_completed: string[];
  exercises_done: number;
  exercises_correct: number;
  topics_practiced: string[];
}

export interface UserProgress {
  user: {
    daily_goal_minutes: number;
    streak_current: number;
    streak_best: number;
    total_lessons_completed: number;
    total_exercises_done: number;
    last_session_date: string | null;
  };
  topics: Record<string, TopicProgress>;
  weak_items: WeakItem[];
  session_history: SessionHistory[];
}

export interface Confusion {
  correct: string;
  chosen_instead: string;
  topic: string;
  exercise_type: string;
  count: number;
  last_seen: string;
  lesson_ids: string[];
}

export interface DistractorMemory {
  confusions: Confusion[];
  micro_lessons_injected: string[];
}

export interface ConjugationTable {
  infinitive: string;
  meaning_fr: string;
  aspect: 'imperfective' | 'perfective';
  tables: Record<string, Record<string, string>>;
  notes_fr: string[];
}
