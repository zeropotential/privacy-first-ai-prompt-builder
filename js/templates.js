// templates.js — Base personas, pricing table, and prompt construction engine

export const BASE_PERSONAS = [
  { id: 'senior-dev', label: 'Senior Developer', systemPrefix: 'Adopt the professional persona of a Senior Software Developer with 15+ years of experience.', expertiseLevel: 'expert' },
  { id: 'marketing-strategist', label: 'Marketing Strategist', systemPrefix: 'Adopt the professional persona of a Marketing Strategist specializing in growth and brand positioning.', expertiseLevel: 'expert' },
  { id: 'accountant', label: 'Senior Accountant', systemPrefix: 'Adopt the professional persona of a Senior Accountant with deep expertise in financial reporting and compliance.', expertiseLevel: 'expert' },
  { id: 'data-analyst', label: 'Data Analyst', systemPrefix: 'Adopt the professional persona of a Data Analyst skilled in statistical modeling and data visualization.', expertiseLevel: 'expert' },
  { id: 'ux-researcher', label: 'UX Researcher', systemPrefix: 'Adopt the professional persona of a UX Researcher specializing in user behavior analysis and usability testing.', expertiseLevel: 'expert' },
  { id: 'legal-advisor', label: 'Legal Advisor', systemPrefix: 'Adopt the professional persona of a Legal Advisor with broad knowledge of regulatory frameworks and contract law.', expertiseLevel: 'expert' },
  { id: 'medical-consultant', label: 'Medical Consultant', systemPrefix: 'Adopt the professional persona of a Medical Consultant with clinical and research expertise.', expertiseLevel: 'expert' },
  { id: 'creative-writer', label: 'Creative Writer', systemPrefix: 'Adopt the professional persona of a Creative Writer with mastery of narrative structure, voice, and style.', expertiseLevel: 'expert' },
  { id: 'project-manager', label: 'Project Manager', systemPrefix: 'Adopt the professional persona of a Project Manager experienced in Agile, Scrum, and cross-functional team leadership.', expertiseLevel: 'expert' },
  { id: 'educator', label: 'Educator', systemPrefix: 'Adopt the professional persona of an Educator skilled in curriculum design, pedagogy, and knowledge transfer.', expertiseLevel: 'expert' },
];

export const PRICING_TABLE = {
  lastUpdated: '2026-04-01',
  models: {
    'GPT-4o':            { inputPer1M: 2.50,  label: 'GPT-4o' },
    'Claude 3.5 Sonnet': { inputPer1M: 3.00,  label: 'Claude 3.5 Sonnet' },
    'Gemini 1.5 Pro':    { inputPer1M: 1.25,  label: 'Gemini 1.5 Pro' },
  },
};

const TONE_MAP = {
  formal:        'Use a formal, professional tone throughout.',
  casual:        'Use a casual, conversational tone throughout.',
  persuasive:    'Use a persuasive, compelling tone throughout.',
  analytical:    'Use an analytical, data-driven tone throughout.',
  empathetic:    'Use an empathetic, understanding tone throughout.',
  authoritative: 'Use an authoritative, confident tone throughout.',
};

const FORMAT_RULES = {
  markdown:      'Format your entire response in clean Markdown with appropriate headers, lists, and emphasis.',
  json:          'Return valid JSON only. Do not wrap in markdown code fences. Do not include any text outside the JSON structure.',
  'bullet-points': 'Structure your entire response as bullet points. No prose paragraphs.',
  'numbered-list': 'Structure your entire response as a numbered list.',
  table:         'Present your response as a Markdown table with clear column headers.',
  'plain-text':  'Respond in plain text only. No Markdown formatting, no special characters.',
};

const GUARDRAIL = `CONSTRAINTS:
- Do not use preamble or introductory filler.
- Do not explain your reasoning unless explicitly asked.
- Avoid AI-isms: never use words like "tapestry", "delve", "in the digital age", "landscape", "realm", "straightforward".
- Do not start responses with "Certainly", "Of course", "Absolutely", "Great question", or similar.
- Stick strictly to the requested output format.`;

/**
 * Build a full system prompt from CO-STAR-A form fields.
 * @param {Object} fields
 * @param {string} fields.context
 * @param {string} fields.objective
 * @param {string} fields.style       - persona id or "custom"
 * @param {string} fields.customStyle - free-text if style === "custom"
 * @param {string} fields.tone        - key from TONE_MAP
 * @param {string} fields.audience
 * @param {string} fields.format      - key from FORMAT_RULES
 * @param {string} fields.constraints - user-supplied answer constraints
 * @returns {string}
 */
export function buildPrompt(fields) {
  const sections = [];

  // --- Identity Layer ---
  const persona = fields.style === 'custom'
    ? fields.customStyle?.trim()
      ? `Adopt the persona of: ${fields.customStyle.trim()}.`
      : ''
    : BASE_PERSONAS.find(p => p.id === fields.style)?.systemPrefix ?? '';

  const tone = TONE_MAP[fields.tone] ?? '';

  if (persona || tone) {
    sections.push(`# ROLE\n${[persona, tone].filter(Boolean).join(' ')}`);
  }

  // --- Goal Layer ---
  if (fields.objective?.trim()) {
    sections.push(`# TASK\n${fields.objective.trim()}`);
  }

  // --- Contextual Layer ---
  const ctxParts = [];
  if (fields.context?.trim()) ctxParts.push(fields.context.trim());
  if (fields.audience?.trim()) ctxParts.push(`Your audience is: ${fields.audience.trim()}. Tailor language, depth, and examples accordingly.`);
  if (ctxParts.length) {
    sections.push(`# CONTEXT\n${ctxParts.join('\n\n')}`);
  }

  // --- Format Layer ---
  const formatRule = FORMAT_RULES[fields.format] ?? '';
  if (formatRule) {
    sections.push(`# OUTPUT FORMAT\n${formatRule}`);
  }

  // --- Guardrail Layer ---
  const guardParts = [GUARDRAIL];
  if (fields.constraints?.trim()) {
    guardParts.push(`ADDITIONAL RULES:\n- ${fields.constraints.trim().split('\n').join('\n- ')}`);
  }
  sections.push(guardParts.join('\n\n'));

  return sections.join('\n\n');
}
