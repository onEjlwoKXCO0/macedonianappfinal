export const TOPIC_LABELS: Record<string, string> = {
  // Grammaire — Fondamentaux
  pronouns_personal: 'Pronoms personnels',
  sum_present: 'Verbe être — présent',
  negation: 'Négation',
  question_words: 'Mots interrogatifs',
  regular_verbs_present: 'Verbes réguliers — présent',
  definite_articles: 'Articles définis',
  noun_gender: 'Genre des noms',
  // Grammaire — Temps et aspect
  future_kje: 'Futur avec kje',
  past_l_forms: 'Passé — formes en L',
  verbal_aspect: 'Aspect verbal',
  aspect_pairs: "Paires d'aspect",
  aorist: 'Aoriste',
  // Grammaire — Pronoms et déterminants
  pronouns_possessive: 'Pronoms possessifs',
  possessives: 'Possessifs',
  demonstratives: 'Démonstratifs',
  pronouns_advanced: 'Pronoms avancés',
  indirect_object_pronouns: 'Pronoms objet indirect',
  clitic_doubling: 'Doublement des clitiques',
  reflexive_verbs: 'Verbes réfléchis',
  // Grammaire — Structure de la phrase
  subordinate_clauses: 'Propositions subordonnées',
  relative_clauses: 'Propositions relatives',
  imperative: 'Impératif',
  conditional: 'Conditionnel',
  modal_da: 'Modal da',
  questions_dali: 'Questions avec dali',
  negation_advanced: 'Négation avancée',
  passive_se: 'Passif en se',
  admirative: 'Mode admiratif',
  // Grammaire — Noms et adjectifs
  adjective_agreement: 'Accord des adjectifs',
  comparative_superlative: 'Comparatif et superlatif',
  verbal_nouns: 'Noms verbaux',
  // Grammaire — Prépositions
  prepositions: 'Prépositions',
  vo_na_od: 'Prépositions vo / na / od',
  // Grammaire — Verbes spéciaux
  motion_verbs: 'Verbes de mouvement',
  sentiment_verbs: 'Verbes de sentiment',
  // Grammaire — Nombres
  numbers_1_100: 'Chiffres 1–100',
  numbers_advanced: 'Chiffres avancés',
  ordinals: 'Nombres ordinaux',
  // Thématique
  greetings: 'Salutations',
  family: 'Famille',
  directions: 'Directions',
  colors_descriptions: 'Couleurs et descriptions',
  food_restaurant: 'Nourriture et restaurant',
  shopping_money: 'Shopping et argent',
  health_body: 'Santé et corps',
  daily_routine: 'Routine quotidienne',
  travel: 'Voyage',
  work_school: 'Travail et école',
  weather: 'Météo',
  calendar: 'Calendrier',
  dates: 'Dates',
  telling_time: 'Heure',
};

export function getTopicLabel(topic: string): string {
  return TOPIC_LABELS[topic] ?? topic.replace(/_/g, ' ');
}
