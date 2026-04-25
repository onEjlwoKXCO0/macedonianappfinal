/**
 * Romanization normalizer for Macedonian input from a French speaker.
 * Official romanization: Š=sh, Č=ch, Ž=zh, Dž=dzh, Ѓ=gy, Ќ=kj, Lj=lj, Nj=nj, Ц=c, Ј=j
 *
 * Algorithm (applied in order):
 * 1. Lowercase + trim
 * 2. Replace official diacritic forms with ASCII equivalents
 * 3. Strip remaining diacritics (French keyboard accents)
 * 4. Apply ASCII variant substitutions longest-first
 * 5. Compare normalized strings
 */

function stripDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalize(raw: string): string {
  let s = raw.toLowerCase().trim();

  // Step 2: replace official diacritic romanization forms with canonical ASCII
  s = s.replace(/dž/g, 'dzh');
  s = s.replace(/ž/g, 'zh');
  s = s.replace(/č/g, 'ch');
  s = s.replace(/š/g, 'sh');
  // Ѓ diacritic forms
  s = s.replace(/ǵ/g, 'gy');
  // Ќ diacritic forms
  s = s.replace(/ḱ/g, 'kj');
  // Lj / Nj with combining
  s = s.replace(/ĺ/g, 'lj');
  s = s.replace(/ń/g, 'nj');

  // Step 3: strip remaining diacritics (é→e, è→e, ê→e, etc.)
  s = stripDiacritics(s);

  // Step 4: ASCII variant substitutions — LONGEST patterns first to avoid partial matches
  s = s.replace(/dzh/g, 'dzh');  // keep canonical
  s = s.replace(/sch/g, 'sh');   // sch → sh (Ш)
  s = s.replace(/tsh/g, 'ch');   // tsh → ch (Ч)

  // Ж variants (zh, z as loose variant — only when z appears as variant for zh)
  // We don't replace bare 'z' as it legitimately appears in Macedonian words

  // Ш variants
  // 'sh' is already canonical, no replacement needed

  // Ч variants
  // 'ch' is already canonical, no replacement needed

  // Džh / Dž variants (Џ)
  s = s.replace(/\bdz\b/g, 'dzh');  // standalone dz → dzh only at word boundary

  // Ѓ variants
  s = s.replace(/gj/g, 'gy');    // gj → gy
  s = s.replace(/dj/g, 'gy');    // dj → gy

  // Ќ variants
  s = s.replace(/ky/g, 'kj');    // ky → kj

  // Љ variants
  s = s.replace(/ly/g, 'lj');    // ly → lj
  s = s.replace(/ll/g, 'lj');    // ll → lj (but only likely in Macedonian context)

  // Њ variants
  s = s.replace(/ny/g, 'nj');    // ny → nj
  s = s.replace(/gn/g, 'nj');    // gn → nj

  // Ц variants
  s = s.replace(/tz/g, 'c');     // tz → c
  s = s.replace(/ts/g, 'c');     // ts → c (apply BEFORE s cleanup to avoid conflict)

  // Ј variants: j is already canonical; y→j only in certain positions is too risky
  // We skip y→j globally as 'y' doesn't appear in official Macedonian romanization otherwise

  return s;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function answersMatch(
  userInput: string,
  correct: string,
  alternatives: string[] = []
): boolean {
  const normUser = normalize(userInput);
  const normCorrect = normalize(correct);

  if (normUser === normCorrect) return true;

  for (const alt of alternatives) {
    if (normUser === normalize(alt)) return true;
  }

  // Levenshtein ≤ 2 only for words longer than 5 characters
  if (normCorrect.length > 5 && levenshtein(normUser, normCorrect) <= 2) return true;

  return false;
}

export type HintColor = 'none' | 'orange' | 'green';

export function getHintColor(
  userInput: string,
  correct: string,
  alternatives: string[] = []
): HintColor {
  if (!userInput.trim()) return 'none';

  if (answersMatch(userInput, correct, alternatives)) return 'green';

  const normUser = normalize(userInput);
  const normCorrect = normalize(correct);

  if (levenshtein(normUser, normCorrect) <= 3) return 'orange';

  for (const alt of alternatives) {
    if (levenshtein(normUser, normalize(alt)) <= 3) return 'orange';
  }

  return 'none';
}

export { normalize as normalizeInput };
