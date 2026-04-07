// ui.js — DOM helpers, clipboard, animations, toast, preview rendering

import { buildPrompt, PRICING_TABLE } from './templates.js';
import { countTokens, estimateCosts, tokenTier, compressPrompt } from './tokenizer.js';

// --- DOM refs (cached on init) ---
let els = {};

export function cacheElements() {
  els = {
    // Inputs
    context:        document.getElementById('field-context'),
    objective:      document.getElementById('field-objective'),
    style:          document.getElementById('field-style'),
    customStyle:    document.getElementById('field-custom-style'),
    customStyleWrap:document.getElementById('custom-style-wrap'),
    tone:           document.getElementById('field-tone'),
    audience:       document.getElementById('field-audience'),
    format:         document.getElementById('field-format'),
    constraints:    document.getElementById('field-constraints'),

    // Vault
    preview:        document.getElementById('vault-preview'),
    tokenCount:     document.getElementById('token-count'),
    tokenMeter:     document.getElementById('token-meter'),
    tokenMeterBar:  document.getElementById('token-meter-bar'),
    tokenStatus:    document.getElementById('token-status'),
    costList:       document.getElementById('cost-list'),
    pricingDate:    document.getElementById('pricing-date'),
    tokenSaver:     document.getElementById('token-saver'),
    tokenSaverTrack:document.getElementById('token-saver-track'),
    compressionInfo:document.getElementById('compression-info'),

    // Buttons
    btnConstruct:   document.getElementById('btn-construct'),
    btnCopy:        document.getElementById('btn-copy'),
    btnNuke:        document.getElementById('btn-nuke'),
    btnTheme:       document.getElementById('btn-theme'),

    // Toast
    toast:          document.getElementById('toast'),
  };
}

// --- Read form fields ---
export function readFields() {
  return {
    context:     els.context.value,
    objective:   els.objective.value,
    style:       els.style.value,
    customStyle: els.customStyle.value,
    tone:        els.tone.value,
    audience:    els.audience.value,
    format:      els.format.value,
    constraints: els.constraints.value,
  };
}

// --- Render the live preview + token stats ---
let lastPromptText = '';

export function renderPreview() {
  const fields = readFields();
  const originalPromptText = buildPrompt(fields);
  const originalTokens = countTokens(originalPromptText);
  let promptText = originalPromptText;
  let savedPercent = 0;
  let reducedTokens = originalTokens;

  if (els.tokenSaverTrack) {
    els.tokenSaverTrack.classList.toggle('active', els.tokenSaver.checked);
    els.tokenSaverTrack.setAttribute('aria-checked', String(els.tokenSaver.checked));
  }

  if (els.tokenSaver.checked) {
    const result = compressPrompt(promptText);
    promptText = result.compressed;
    savedPercent = result.savedPercent;
    reducedTokens = countTokens(promptText);
  }

  lastPromptText = promptText;
  els.preview.textContent = promptText || 'Your compiled prompt will appear here…';

  // Token count + meter
  const tokens = countTokens(promptText);
  els.tokenCount.textContent = tokens.toLocaleString();
  const tier = tokenTier(tokens);
  els.tokenMeterBar.className = `h-full rounded-full transition-all duration-300 meter-${tier}`;
  els.tokenMeterBar.style.width = `${Math.min(100, (tokens / 2000) * 100)}%`;

  // Cost estimates
  const costs = estimateCosts(tokens);
  els.costList.innerHTML = costs.map(c =>
    `<div class="flex justify-between text-sm"><span class="text-gray-500 dark:text-gray-400">${escapeHtml(c.label)}</span><span class="font-mono">${escapeHtml(c.cost)}</span></div>`
  ).join('');

  if (els.tokenSaver.checked) {
    if (savedPercent > 0) {
      els.tokenStatus.textContent = `Token Saver is on. Reduced prompt from ${originalTokens} to ${reducedTokens} tokens (${savedPercent}% saved).`;
    } else {
      els.tokenStatus.textContent = 'Token Saver is on, but this prompt is already concise so there was nothing useful to remove.';
    }
  } else {
    els.tokenStatus.textContent = 'Estimated size of your final prompt before you paste it into an AI tool.';
  }

  // Compression info
  if (els.tokenSaver.checked && savedPercent > 0) {
    els.compressionInfo.textContent = `Token Saver reduced ${savedPercent}% of tokens`;
    els.compressionInfo.classList.remove('hidden');
  } else {
    els.compressionInfo.classList.add('hidden');
  }
}

// --- Copy to clipboard ---
export async function copyToClipboard() {
  if (!lastPromptText) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(lastPromptText);
    } else {
      const copied = fallbackCopyText(lastPromptText);
      if (!copied) throw new Error('Clipboard fallback failed');
    }
    showCopySuccess();
  } catch {
    // Final fallback for browsers that block clipboard APIs.
    const copied = fallbackCopyText(lastPromptText);
    if (copied) {
      showCopySuccess();
      return;
    }
    showToast('Failed to copy. Please select text in The Vault and press Ctrl/Cmd + C.');
  }
}

function showCopySuccess() {
  els.btnCopy.classList.add('copy-success');
  els.btnCopy.innerHTML = `<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Copied!`;
  showToast('Prompt copied to clipboard');
  setTimeout(() => {
    els.btnCopy.classList.remove('copy-success');
    els.btnCopy.innerHTML = `<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy`;
  }, 2000);
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

// --- Nuke Session ---
export function nukeSession() {
  els.context.value = '';
  els.objective.value = '';
  els.style.value = 'senior-dev';
  els.customStyle.value = '';
  els.customStyleWrap.classList.add('hidden');
  els.tone.value = 'formal';
  els.audience.value = '';
  els.format.value = 'markdown';
  els.constraints.value = '';
  els.tokenSaver.checked = false;
  lastPromptText = '';
  renderPreview();
  showToast('Session cleared — all data wiped from memory');
}

// --- Custom style toggle ---
export function handleStyleChange() {
  if (els.style.value === 'custom') {
    els.customStyleWrap.classList.remove('hidden');
    els.customStyle.focus();
  } else {
    els.customStyleWrap.classList.add('hidden');
    els.customStyle.value = '';
  }
}

// --- Dark mode ---
export function initTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
  updateThemeIcon();
}

export function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function updateThemeIcon() {
  if (!els.btnTheme) return;
  const isDark = document.documentElement.classList.contains('dark');
  // Sun icon for dark (click to go light), Moon icon for light (click to go dark)
  els.btnTheme.innerHTML = isDark
    ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
    : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
  els.btnTheme.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

// --- Toast ---
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden', 'opacity-0');
  els.toast.classList.add('opacity-100');
  setTimeout(() => {
    els.toast.classList.remove('opacity-100');
    els.toast.classList.add('opacity-0');
    setTimeout(() => els.toast.classList.add('hidden'), 300);
  }, 2500);
}

// --- Utility ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
