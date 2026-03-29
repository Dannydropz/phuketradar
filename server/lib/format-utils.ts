/**
 * Utility functions for formatting article content
 */

/**
 * Ensures article content has proper paragraph formatting.
 * This prevents "wall of text" issues when AI returns poorly formatted content.
 * Handles both plain text with newlines and existing HTML with insufficient breaks.
 */
export function ensureProperParagraphFormatting(content: string): string {
  if (!content || content.trim() === '') return content;

  // Count existing paragraph tags
  const paragraphTagCount = (content.match(/<p[^>]*>/g) || []).length;
  const hasMultipleParagraphs = paragraphTagCount > 1;

  // We only consider it "well-formatted" if it has multiple paragraphs
  // OR if it's a very short article (less than 200 chars and less than 3 sentences)
  const isShort = content.length < 200;
  const sentencesCount = content.split(/(?<=[.!?]["']?)\s+/).length;
  const isMinimal = isShort && sentencesCount < 3;

  if (hasMultipleParagraphs || (paragraphTagCount === 1 && isMinimal)) {
    // If it's already well-formatted or intentionally a single short paragraph, leave it
    // But still do a quick check for escaped newlines just in case
    if (!content.includes('\\n')) {
      return content;
    }
  }

  // Content needs formatting - either no <p> tags, just one giant paragraph, or escaped newlines
  let formattedContent = content;

  // 1. Handle escaped newlines (\\n) which may appear in JSON or improperly stored content
  formattedContent = formattedContent.replace(/\\n\\n/g, '\n\n'); // Double escaped newlines
  formattedContent = formattedContent.replace(/\\n/g, '\n'); // Single escaped newlines
  formattedContent = formattedContent.replace(/\r\n/g, '\n'); // Windows-style newlines

  // 2. If it's all wrapped in a single <p> tag, strip it so we can re-split
  if (paragraphTagCount === 1 && formattedContent.trim().startsWith('<p') && formattedContent.trim().endsWith('</p>')) {
      // Use a more robust check for single-paragraph wrapper
      const singlePRegex = /^<p[^>]*>([\s\S]*)<\/p>$/;
      const match = formattedContent.trim().match(singlePRegex);
      if (match) {
          formattedContent = match[1];
      }
  }

  // 3. Convert actual newlines to paragraph breaks
  // Convert \n\n to paragraph breaks
  formattedContent = formattedContent.replace(/\n\n+/g, '</p><p>');

  // Convert single \n to paragraph breaks if they aren't already handled
  // (news articles should have frequent paragraph breaks)
  formattedContent = formattedContent.replace(/\n/g, '</p><p>');

  // Handle <br> tags that should be paragraph breaks for better "prose" styling
  formattedContent = formattedContent.replace(/<br\s*\/?>/gi, '</p><p>');

  // 4. Check if we still have a "wall of text" (less than 2 paragraphs)
  const currentParagraphCount = (formattedContent.match(/<\/p><p>/g) || []).length + 1;

  if (currentParagraphCount < 2) {
    // Strip tags to get clean text for sentence splitting
    const textContent = formattedContent.replace(/<[^>]*>/g, ' ').trim();
    
    // Split at sentence boundaries
    const sentences = textContent.split(/(?<=[.!?]["']?)\s+(?=[A-Z0-9])/);

    if (sentences.length >= 2) {
      // Group sentences into smaller paragraphs (2-3 sentences each)
      // For very short stories (2-3 sentences total), split every sentence
      const maxSentencesPerPara = sentences.length <= 3 ? 1 : 2;
      
      const paragraphs: string[] = [];
      let currentParagraph: string[] = [];

      sentences.forEach((sentence, index) => {
        currentParagraph.push(sentence);
        
        // Natural break indicators
        const isNaturalBreak = 
          sentence.toLowerCase().includes('meanwhile') ||
          sentence.toLowerCase().includes('however') ||
          sentence.toLowerCase().includes('additionally') ||
          sentence.toLowerCase().includes('according to') ||
          sentence.toLowerCase().includes('officials said');

        if (currentParagraph.length >= maxSentencesPerPara || isNaturalBreak || index === sentences.length - 1) {
          paragraphs.push(currentParagraph.join(' '));
          currentParagraph = [];
        }
      });

      formattedContent = paragraphs.join('</p><p>');
    }
  }

  // 5. Final wrap and cleanup
  // Clean up any existing partial <p> tags before wrapping
  formattedContent = formattedContent.replace(/^\s*<\/p>/, '');
  formattedContent = formattedContent.replace(/<p>\s*$/, '');

  // Wrap in <p> tags if not already
  if (!formattedContent.trim().startsWith('<p')) {
    formattedContent = '<p>' + formattedContent;
  }
  if (!formattedContent.trim().endsWith('</p>')) {
    formattedContent = formattedContent + '</p>';
  }

  // Final cleanup of empty paragraphs and double tags
  formattedContent = formattedContent
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p><p>/g, '<p>')
    .replace(/<\/p><\/p>/g, '</p>')
    .replace(/<p>\s*<p>/g, '<p>')
    .replace(/<\/p>\s*<\/p>/g, '</p>');

  // Preserve headers (h1-h6) - they shouldn't be inside <p>
  formattedContent = formattedContent.replace(/<p>\s*(<h[1-6][^>]*>)/gi, '$1');
  formattedContent = formattedContent.replace(/(<\/h[1-6]>)\s*<\/p>/gi, '$1');

  return formattedContent;
}

/**
 * Enforces the "Soi [Name]" convention in Phuket news stories.
 * Phuket residents and locals always refer to side streets as "Soi Bangla", not "Bangla Soi".
 */
export function enforceSoiNamingConvention(text: string): string {
  if (!text) return text;

  // Regex breakdown:
  // \b([A-Z][a-zA-Z0-9\-\.]{2,}) -> Matches a capitalized name
  // \s+                          -> Matches whitespace
  // [Ss]oi\b                     -> Matches "Soi" or "soi" at the end
  return text.replace(/\b([A-Z][a-zA-Z0-9\-\.]{2,})\s+[Ss]oi\b/g, 'Soi $1');
}
