// Semantic similarity utilities using cosine similarity for duplicate detection

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    // Gracefully handle dimension mismatch (e.g. migrating from large to small embeddings)
    // Just return 0 similarity so we don't crash, effectively ignoring old incompatible embeddings
    return 0;
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
  matchedArticleContent?: string;
}

export interface SimilarArticle {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

export function checkSemanticDuplicate(
  embedding: number[],
  existingEmbeddings: { id: string; title: string; content: string; embedding: number[] | null }[],
  threshold: number = 0.7
): SemanticDuplicateChecker {
  let maxSimilarity = 0;
  let matchedArticle: { id: string; title: string; content: string } | null = null;

  for (const existing of existingEmbeddings) {
    if (!existing.embedding) {
      continue;
    }

    const similarity = cosineSimilarity(embedding, existing.embedding);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      matchedArticle = { id: existing.id, title: existing.title, content: existing.content };
    }
  }

  return {
    isDuplicate: maxSimilarity >= threshold,
    similarity: maxSimilarity,
    matchedArticleId: matchedArticle?.id,
    matchedArticleTitle: matchedArticle?.title,
    matchedArticleContent: matchedArticle?.content,
  };
}

export function getTopSimilarArticles(
  embedding: number[],
  existingEmbeddings: { id: string; title: string; content: string; embedding: number[] | null }[],
  topN: number = 5
): SimilarArticle[] {
  const similarities: SimilarArticle[] = [];

  for (const existing of existingEmbeddings) {
    if (!existing.embedding) {
      continue;
    }

    const similarity = cosineSimilarity(embedding, existing.embedding);

    similarities.push({
      id: existing.id,
      title: existing.title,
      content: existing.content,
      similarity: similarity
    });
  }

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}
