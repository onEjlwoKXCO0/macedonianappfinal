@AGENTS.md
@~/.claude/commands/vercel-react-best-practices.md
@~/.claude/commands/design-best-practices.md

# MK Learn — Cahier des charges

Application personnelle d'apprentissage du macédonien (objectif C1). UI en français, macédonien romanisé uniquement (jamais de cyrillique dans les exercices).

## Stack

- Next.js 14+ App Router, TypeScript strict, Tailwind CSS v4
- Données : `data/approved/*.json` (51 leçons A1→C1)
- Auth & sync : **Supabase** (à implémenter — voir ci-dessous)

## Algorithme de répétition espacée

**FSRS-5** (Free Spaced Repetition Scheduler) — PAS SM-2.
- Rétention cible : **90%**
- Paramètres FSRS portés depuis Anki : `0.2120, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.0010, 1.8722, 0.1666, 0.7960, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542`
- **15 nouvelles cartes/jour** (cap journalier)
- Les cartes ne sont créées qu'à la **complétion d'une leçon** (jamais au chargement de /review)
- Étapes d'apprentissage : 1m → 10m (comme Anki)
- Étape de ré-apprentissage : 10m
- Seuil pénible (leech) : 8 lapses

## Persistance et synchronisation (PRIORITÉ HAUTE)

**Problème actuel** : tout est en localStorage — perdu si le navigateur est nettoyé, non partagé entre machines.

**Exigences** :
1. Les progrès survivent à la fermeture / mise en veille du PC
2. Les progrès se retrouvent sur **une autre machine** (même compte)
3. L'app doit fonctionner sur **téléphone**

**Solution cible : Supabase + local-first**
- Supabase (PostgreSQL) pour la persistance et la sync cross-device
- Stratégie **local-first** : localStorage comme cache immédiat, sync Supabase en arrière-plan
- Auth : email + magic link (pas de mot de passe à retenir)
- Tables : `cards` (états FSRS), `progress` (topics, sessions, streak), `distractor_memory` (paires de confusion)
- Sync : upsert optimiste à chaque changement de carte, réconciliation au chargement

**Pour l'implémentation Supabase** :
- Créer projet sur supabase.com
- Variables d'env : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Ne jamais stocker la clé service dans le client

## Support mobile (PWA)

- Le CSS responsive existe déjà (`.bottom-nav` mobile, `.side-nav` desktop)
- Ajouter `manifest.json` et balises PWA dans `app/layout.tsx`
- Viewport déjà configuré via Next.js metadata
- Service worker optionnel (offline first via Supabase local cache)

## Roadmap prioritaire

1. ✅ FSRS-5 (`lib/spaced-repetition.ts`)
2. ✅ Gate leçon (cartes créées à la complétion, pas au chargement)
3. ✅ 15 nouvelles cartes/jour + settings page
4. ✅ Bouton "10 exercices difficiles" dans /practice
5. 🔲 Supabase — auth + sync des cartes
6. 🔲 Supabase — sync progress + distractor memory
7. 🔲 PWA manifest + icônes mobile
8. 🔲 Keyboard shortcuts dans /review (1/2/3/4, Space/Enter)

## Règles de développement

- Pas de Cyrillic dans les exercices (seulement dans les tableaux de référence optionnels)
- `verbs_present: []` est OK si la leçon ne porte pas sur les verbes
- Les API routes (`/api/*`) font des écritures filesystem — dev uniquement, Supabase en prod
- Ne jamais appeler `ensureCardsForLesson` au chargement de /review — seulement à la fin d'une leçon
