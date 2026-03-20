// groqAdapter.js - Thin wrapper around utils/ai.js for the assistant controller.
// Provides: timeout + retry only. No JSON validation, no structured output.
// Tool execution logic lives in assistantController.js.

const { runAssistant, GroqError } = require('./ai');

const RETRYABLE = /\(429\)|\(500\)|\(502\)|\(503\)|\(504\)|fetch failed|too long/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run the assistant with retry logic.
 *
 * @param {object} opts
 * @param {Array} opts.messages - OpenAI-style messages
 * @param {Array} opts.tools - Groq function definitions
 * @param {Function} opts.toolExecutor - async (name, args) => { reply, actions, products }
 * @param {number} [opts.timeoutMs=9000]
 * @param {number} [opts.maxSteps=3]
 * @returns {Promise<{reply: string, actions: Array, products: Array, meta: Object}>}
 */
async function runAssistantWithRetry({ messages, tools, toolExecutor, timeoutMs = 9000, maxSteps = 3 }) {
  const RETRY_DELAYS = [4000, 8000];
  let lastErr;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS[attempt - 1]);
    }
    try {
      return await runAssistant({
        messages,
        tools,
        toolExecutor,
        timeoutMs,
        maxSteps,
      });
    } catch (err) {
      lastErr = err;
      const msg = String(err.message || err);
      console.error(`[groqAdapter] attempt ${attempt} ->`, msg.slice(0, 400));
      if (!RETRYABLE.test(msg)) break;
    }
  }

  const err = lastErr;
  const msg = String(err.message || "");
  if (err instanceof GroqError) throw err;
  if (/GROQ_API_KEY/.test(msg)) throw new GroqError("The AI assistant is not configured yet.", 503);
  if (/\(429\)/.test(msg)) throw new GroqError("The assistant is busy right now. Try again in a moment.", 503);
  if (/\(401\)|\(403\)/.test(msg)) throw new GroqError("The AI assistant is not configured correctly.", 503);
  if (/\(400\)/.test(msg)) throw new GroqError("I could not understand that. Try rephrasing.", 400);
  throw new GroqError("The assistant is unavailable right now.", 503);
}

module.exports = { runAssistantWithRetry, GroqError };
