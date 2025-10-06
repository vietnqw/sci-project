/**
 * Normalizes text for fuzzy matching by:
 * - Converting to lowercase
 * - Removing accents and diacritics
 * - Removing extra whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

/**
 * Checks if search term matches target text using fuzzy matching.
 * The search is:
 * - Case-insensitive (D vs d is the same)
 * - Dialect-insensitive (a vs á vs ẩ are the same)
 * - Order-independent (characters can be in any order)
 */
export function fuzzyMatch(searchTerm: string, targetText: string): boolean {
  if (!searchTerm.trim()) return true;

  const normalizedSearch = normalizeText(searchTerm);
  const normalizedTarget = normalizeText(targetText);

  // If search term is empty after normalization, match everything
  if (!normalizedSearch) return true;

  // Convert both to character arrays for order-independent matching
  const searchChars = normalizedSearch.split('').filter(char => char !== ' ');
  const targetChars = normalizedTarget.split('');

  // Check if all search characters exist in target (order-independent)
  for (const searchChar of searchChars) {
    const charIndex = targetChars.indexOf(searchChar);
    if (charIndex === -1) {
      return false; // Character not found
    }
    // Remove the found character to avoid counting duplicates
    targetChars.splice(charIndex, 1);
  }

  return true;
}

/**
 * Filters an array of strings using fuzzy matching
 */
export function fuzzyFilter<T>(
  items: T[],
  searchTerm: string,
  getText: (item: T) => string
): T[] {
  if (!searchTerm.trim()) return items;

  return items.filter(item => {
    const text = getText(item);
    return fuzzyMatch(searchTerm, text);
  });
}

/**
 * Sorts search results by relevance (exact matches first, then fuzzy matches)
 */
export function fuzzySort<T>(
  items: T[],
  searchTerm: string,
  getText: (item: T) => string
): T[] {
  if (!searchTerm.trim()) return items;

  const normalizedSearch = normalizeText(searchTerm);

  return items
    .map(item => ({
      item,
      text: normalizeText(getText(item)),
      score: calculateRelevanceScore(normalizedSearch, normalizeText(getText(item)))
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

/**
 * Calculates a relevance score for sorting
 * Higher score = more relevant
 */
function calculateRelevanceScore(searchTerm: string, targetText: string): number {
  let score = 0;

  // Exact match gets highest score
  if (targetText === searchTerm) {
    return 1000;
  }

  // Starts with search term gets high score
  if (targetText.startsWith(searchTerm)) {
    score += 500;
  }

  // Contains search term as substring gets medium score
  if (targetText.includes(searchTerm)) {
    score += 200;
  }

  // Count matching characters (order-independent)
  const searchChars = searchTerm.split('');
  const targetChars = targetText.split('');

  for (const char of searchChars) {
    const charIndex = targetChars.indexOf(char);
    if (charIndex !== -1) {
      score += 10;
      targetChars.splice(charIndex, 1); // Remove to avoid double counting
    }
  }

  return score;
}

/**
 * Word-level matching: all words in searchTerm must appear in targetText
 * (order-independent). Case- and accent-insensitive.
 */
export function wordMatch(searchTerm: string, targetText: string): boolean {
  if (!searchTerm.trim()) return true;

  const normalizedSearch = normalizeText(searchTerm);
  const normalizedTarget = normalizeText(targetText);

  if (!normalizedSearch) return true;

  const words = normalizedSearch.split(' ').map(w => w.trim()).filter(Boolean);
  if (words.length === 0) return true;

  for (const w of words) {
    if (!normalizedTarget.includes(w)) return false;
  }
  return true;
}
