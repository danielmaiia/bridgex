// src/lib/tfidf.ts

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9á-úÁ-Ú\s]/gi, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export function termFrequency(tokens: string[]) {
  const tf: Record<string, number> = {};
  tokens.forEach((t) => (tf[t] = (tf[t] || 0) + 1));
  const total = tokens.length;
  Object.keys(tf).forEach((t) => (tf[t] = tf[t] / total));
  return tf;
}

export function inverseDocumentFrequency(docs: string[][]) {
  const idf: Record<string, number> = {};
  const totalDocs = docs.length;

  docs.forEach((tokens) => {
    const unique = new Set(tokens);
    unique.forEach((word) => {
      idf[word] = (idf[word] || 0) + 1;
    });
  });

  Object.keys(idf).forEach(
    (word) => (idf[word] = Math.log(totalDocs / idf[word]))
  );

  return idf;
}

export function vectorize(tf: Record<string, number>, idf: Record<string, number>) {
  const vector: Record<string, number> = {};
  Object.keys(tf).forEach((t) => {
    vector[t] = tf[t] * (idf[t] || 0);
  });
  return vector;
}

export function cosineSimilarity(a: Record<string, number>, b: Record<string, number>) {
  const words = new Set([...Object.keys(a), ...Object.keys(b)]);

  let dot = 0;
  let magA = 0;
  let magB = 0;

  words.forEach((w) => {
    const va = a[w] || 0;
    const vb = b[w] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  });

  if (magA === 0 || magB === 0) return 0;

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function matchTFIDF(certText: string, targetText: string) {
  const tokensA = normalize(certText);
  const tokensB = normalize(targetText);

  const idf = inverseDocumentFrequency([tokensA, tokensB]);

  const tfA = termFrequency(tokensA);
  const tfB = termFrequency(tokensB);

  const vecA = vectorize(tfA, idf);
  const vecB = vectorize(tfB, idf);

  return cosineSimilarity(vecA, vecB);
}
