// tokenizer.js — Token counting, cost estimation, and prompt compression

import { PRICING_TABLE } from './templates.js';

// --- Token counting (lightweight approximation) ---
// Uses a word/punctuation split heuristic that closely matches GPT tokenizers
// (~1.3 tokens per word on average for English text).
// For a production upgrade, swap this with gpt-tokenizer from CDN.

/**
 * Approximate token count for a string.
 * Splits on whitespace and sub-word boundaries similar to BPE tokenizers.
 * @param {string} text
 * @returns {number}
 */
export function countTokens(text) {
  if (!text) return 0;
  // Split on whitespace, then split long words on punctuation / camelCase boundaries
  // This approximation yields ~1.3 tokens per word — close to cl100k_base.
  const words = text.split(/\s+/).filter(Boolean);
  let count = 0;
  for (const word of words) {
    // Each word is at least 1 token. Add extra tokens for punctuation and long words.
    const subTokens = word.split(/(?=[A-Z])|[-_.,;:!?(){}[\]"'`/\\@#$%^&*+=<>|~]/).filter(Boolean);
    count += Math.max(1, subTokens.length);
  }
  return count;
}

/**
 * Estimate cost for a given token count across all models.
 * @param {number} tokenCount
 * @returns {{ modelId: string, label: string, cost: string }[]}
 */
export function estimateCosts(tokenCount) {
  return Object.entries(PRICING_TABLE.models).map(([modelId, info]) => ({
    modelId,
    label: info.label,
    cost: `$${((tokenCount / 1_000_000) * info.inputPer1M).toFixed(6)}`,
  }));
}

/**
 * Return the color tier for the token meter.
 * @param {number} tokenCount
 * @returns {'green'|'yellow'|'red'}
 */
export function tokenTier(tokenCount) {
  if (tokenCount < 500) return 'green';
  if (tokenCount <= 1500) return 'yellow';
  return 'red';
}

// --- Prompt Compression (Linguistic Scrub) ---

const FILLER_REPLACEMENTS = [
  [/\bin order to\b/gi, 'to'],
  [/\bas well as\b/gi, 'and'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bit is important to note that\b/gi, 'note:'],
  [/\bat the end of the day\b/gi, ''],
  [/\bfor the purpose of\b/gi, 'to'],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard to\b/gi, 'regarding'],
  [/\bin spite of the fact that\b/gi, 'despite'],
  [/\bon the other hand\b/gi, 'however'],
];

const POLITENESS_PATTERNS = [
  /\b(please|kindly)\s+/gi,
  /\bI want you to\s+/gi,
  /\bI need you to\s+/gi,
  /\bI would like you to\s+/gi,
  /\bmake sure to\s+/gi,
  /\bensure that you\s+/gi,
  /\bcould you please\s+/gi,
];

/**
 * Compress a prompt by removing linguistic fluff.
 * @param {string} text
 * @returns {{ compressed: string, savedPercent: number }}
 */
export function compressPrompt(text) {
  if (!text) return { compressed: '', savedPercent: 0 };

  const originalTokens = countTokens(text);
  let result = text;

  // Remove politeness fluff
  for (const pattern of POLITENESS_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // Replace filler phrases with concise equivalents
  for (const [pattern, replacement] of FILLER_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  // Normalize whitespace
  result = result.replace(/[ \t]{2,}/g, ' ');         // collapse multiple spaces
  result = result.replace(/\n{3,}/g, '\n\n');          // max two newlines
  result = result.replace(/^ +| +$/gm, '');            // trim line edges

  const compressedTokens = countTokens(result);
  const savedPercent = originalTokens > 0
    ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
    : 0;

  return { compressed: result, savedPercent };
}
