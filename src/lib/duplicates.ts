import { personName } from "@/lib/people";
import type { Person } from "@/lib/types";

export interface DuplicatePair {
  a: Person;
  b: Person;
  score: number;
  reasons: string[];
}

/** Uzbek is written with several apostrophe conventions (oʻ/o'/o`) and in both Latin
 * and Cyrillic, so the same name is routinely typed a few different ways. Normalising
 * these away is what makes duplicate detection work at all here. */
function normalize(value: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[ʻʼ'`’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein, capped — good enough for short personal names. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const distance = editDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function birthYear(person: Person): number | null {
  if (person.birth_date) return Number(person.birth_date.slice(0, 4));
  const match = person.birth_date_approx?.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

/**
 * Surfaces likely duplicate records for an admin to confirm. Deliberately suggestive,
 * never automatic: merging is destructive, and two cousins genuinely named after the
 * same grandfather are common in exactly the families this is built for.
 */
export function findDuplicateCandidates(people: Person[], threshold = 0.82): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      if (a.gender !== b.gender) continue;

      const firstScore = nameSimilarity(normalize(a.first_name), normalize(b.first_name));
      if (firstScore < 0.75) continue;

      const reasons: string[] = [];
      let score = firstScore * 0.6;
      if (firstScore === 1) reasons.push("ism bir xil");
      else reasons.push("ism juda oʻxshash");

      const lastA = normalize(a.last_name);
      const lastB = normalize(b.last_name);
      if (lastA && lastB) {
        const lastScore = nameSimilarity(lastA, lastB);
        score += lastScore * 0.25;
        if (lastScore > 0.85) reasons.push("familiya mos");
      }

      const patA = normalize(a.patronymic);
      const patB = normalize(b.patronymic);
      if (patA && patB && nameSimilarity(patA, patB) > 0.85) {
        score += 0.1;
        reasons.push("otasining ismi mos");
      }

      const yearA = birthYear(a);
      const yearB = birthYear(b);
      if (yearA && yearB) {
        const gap = Math.abs(yearA - yearB);
        if (gap <= 2) {
          score += 0.15;
          reasons.push("tugʻilgan yili yaqin");
        } else if (gap > 15) {
          // Same name, very different ages — far more likely a grandfather and the
          // grandson named after him than a duplicate.
          score -= 0.35;
          reasons.push("yoshlari juda farq qiladi");
        }
      }

      if (score >= threshold) {
        pairs.push({ a, b, score: Math.min(score, 1), reasons });
      }
    }
  }

  return pairs.sort((x, y) => y.score - x.score);
}

export function pairLabel(pair: DuplicatePair): string {
  return `${personName(pair.a)} / ${personName(pair.b)}`;
}
