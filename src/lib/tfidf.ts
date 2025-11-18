
/**
 * Implementação bem simples de TF-IDF + similaridade do cosseno
 * para demonstrar o pilar de IA no projeto.
 */

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function buildVector(text: string, vocabulary: string[]): number[] {
  const tokens = tokenize(text);
  return vocabulary.map((term) =>
    tokens.includes(term) ? 1 : 0
  );
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

export function matchScore(userText: string, targetText: string): number {
  const vocab = Array.from(
    new Set([...tokenize(userText), ...tokenize(targetText)])
  );
  const vu = buildVector(userText, vocab);
  const vt = buildVector(targetText, vocab);
  return cosineSimilarity(vu, vt);
}
