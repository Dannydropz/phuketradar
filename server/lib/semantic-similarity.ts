// Semantic similarity utilities using cosine similarity for duplicate detection

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

export interface SemanticDuplicateChecker {
  isDuplicate: boolean;
  similarity: number;
  matchedArticleId?: string;
  matchedArticleTitle?: string;
}

export function checkSemanticDuplicate(
  embedding: number[],
  existingEmbeddings: { id: string; title: string; embedding: number[] | null }[],
  threshold: number = 0.7
): SemanticDuplicateChecker {
  let maxSimilarity = 0;
  let matchedArticle: { id: string; title: string } | null = null;

  for (const existing of existingEmbeddings) {
    if (!existing.embedding) {
      continue;
    }

    const similarity = cosineSimilarity(embedding, existing.embedding);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      matchedArticle = { id: existing.id, title: existing.title };
    }
  }

  return {
    isDuplicate: maxSimilarity >= threshold,
    similarity: maxSimilarity,
    matchedArticleId: matchedArticle?.id,
    matchedArticleTitle: matchedArticle?.title,
  };
}
