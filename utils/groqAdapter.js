// groqAdapter.js - Reusable Groq adapter for structured (JSON) API-routing calls.
// Wraps utils/ai.js (raw HTTP) with: timeout, config checks, error normalization
// and response shape validation. Stateless - nothing is ever stored.

const { promptGroq } = require('./ai');

const STEP_TOOLS = [
  'search_products', 'open_product', 'browse_category', 'add_to_cart',
  'open_cart', 'go_checkout', 'place_order', 'track_orders',
  'show_wishlist', 'show_stores', 'show_bundles', 'show_deals',
  'show_home', 'show_profile', 'answer',
];

class GroqError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
  }
}

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new GroqError('The assistant took too long. Please try again.', 504)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

// Groq rejects response_format json_object unless the messages literally
// contain the word "json" - enforce it here so a prompt edit can never break us.
const ensureJsonKeyword = (text) =>
  /json/i.test(text) ? text : `${text}\n\nRespond with json only.`;

const RETRYABLE = /\(429\)|\(500\)|\(502\)|\(503\)|\(504\)|fetch failed|too long/;

/**
 * Structured JSON call to Groq used by the assistant router.
 * @param {object} opts
 * @param {string} opts.prompt       - current user message
 * @param {string} opts.systemPrompt - API knowledge + grounding
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<{reply:string, steps:Array}>} validated shape
 * @throws {GroqError} with .status 400 | 503 | 504
 */
async function groqStructured({ prompt, systemPrompt, timeoutMs = 9000 }) {
  if (!process.env.GROQ_API_KEY) {
    throw new GroqError('The AI assistant is not configured yet.', 503);
  }

  const sys = ensureJsonKeyword(systemPrompt);

  let result;
  let lastErr;
  const RETRY_DELAYS = [4000, 8000]; // free tier 429s clear fast - keep trying
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
    try {
      result = await withTimeout(
        promptGroq(prompt, {
          systemPrompt: sys,
          format: 'json',
          temperature: 0.1,
          maxTokens: 1200, // gpt-oss reasons before answering - needs headroom
        }),
        timeoutMs
      );
      break;
    } catch (err) {
      lastErr = err;
      console.error('[groq] attempt', attempt, '->', String(err.message || err).slice(0, 400));
      if (!RETRYABLE.test(String(err.message || ''))) break;
    }
  }

  if (result === undefined) {
    const err = lastErr;
    if (err instanceof GroqError) throw err;
    const msg = String(err.message || '');
    console.error('[groq] giving up ->', msg.slice(0, 400));
    if (/GROQ_API_KEY/.test(msg)) throw new GroqError('The AI assistant is not configured yet.', 503);
    if (/\(429\)/.test(msg)) throw new GroqError('The assistant is busy right now. Try again in a moment.', 503);
    if (/\(401\)|\(403\)/.test(msg)) throw new GroqError('The AI assistant is not configured correctly.', 503);
    if (/\(400\)/.test(msg)) throw new GroqError('I could not understand that. Try rephrasing.', 400);
    throw new GroqError('The assistant is unavailable right now.', 503);
  }

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new GroqError('The assistant returned an invalid response. Please rephrase.', 400);
  }

  if (typeof result.reply !== 'string' || !result.reply.trim()) result.reply = '';
  else result.reply = result.reply.trim().slice(0, 500);
  if (!Array.isArray(result.steps)) result.steps = [];
  result.steps = result.steps
    .filter((s) => s && typeof s === 'object' && STEP_TOOLS.includes(s.tool))
    .slice(0, 3)
    .map((s) => ({ tool: s.tool, params: s.params && typeof s.params === 'object' ? s.params : {} }));

  return result;
}

module.exports = { groqStructured, GroqError, STEP_TOOLS };
