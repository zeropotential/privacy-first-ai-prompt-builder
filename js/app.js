// app.js — Main orchestrator: wires events, manages state

import {
  cacheElements,
  renderPreview,
  copyToClipboard,
  nukeSession,
  handleStyleChange,
  initTheme,
  toggleTheme,
} from './ui.js';

// --- Debounce helper ---
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  initTheme();

  const debouncedPreview = debounce(renderPreview, 150);

  // Live preview on any input field change
  const inputIds = [
    'field-context', 'field-objective', 'field-style',
    'field-custom-style', 'field-tone', 'field-audience',
    'field-format', 'field-constraints',
  ];
  for (const id of inputIds) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', debouncedPreview);
  }

  // Token saver toggle triggers immediate re-render
  const tokenSaver = document.getElementById('token-saver');
  if (tokenSaver) tokenSaver.addEventListener('change', renderPreview);

  // Style dropdown → show/hide custom input
  const styleSelect = document.getElementById('field-style');
  if (styleSelect) styleSelect.addEventListener('change', () => {
    handleStyleChange();
    debouncedPreview();
  });

  // Construct Final Prompt (same as live preview but explicit)
  const btnConstruct = document.getElementById('btn-construct');
  if (btnConstruct) btnConstruct.addEventListener('click', renderPreview);

  // Copy
  const btnCopy = document.getElementById('btn-copy');
  if (btnCopy) btnCopy.addEventListener('click', copyToClipboard);

  // Nuke
  const btnNuke = document.getElementById('btn-nuke');
  if (btnNuke) btnNuke.addEventListener('click', nukeSession);

  // Theme toggle
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) btnTheme.addEventListener('click', toggleTheme);

  // Initial render
  renderPreview();
});
