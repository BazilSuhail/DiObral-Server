// ai.js - Groq API wrapper with native function calling support.
// Replaces promptGroq / promptGroqStructured / promptGroqStream with a single
// runAssistant() that supports multi-turn tool loops.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

class GroqError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

const withTimeout = (promise, ms) => {
  const timer = new Promise((_, reject) => {
    setTimeout(
      () => reject(new GroqError("The assistant took too long. Please try again.", 504)),
      ms
    );
  });
  return Promise.race([promise, timer]);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RETRYABLE = /\(429\)|\(500\)|\(502\)|\(503\)|\(504\)|fetch failed|too long/;

async function callGroq({ messages, tools, temperature = 0.1, maxTokens = 1024 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqError("The AI assistant is not configured yet.", 503);
  }

  const body = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (tools && tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = `Groq API error (${response.status}): ${JSON.stringify(errorData)}`;
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

/**
 * Run the assistant loop: call Groq, execute tools, call Groq again, etc.
 * Up to MAX_STEPS iterations.
 *
 * @param {Array} messages - OpenAI-style messages array (system + user + tool results)
 * @param {Array} tools - Groq function definitions
 * @param {Function} toolExecutor - async (toolName, args) => { reply, actions, products }
 * @param {number} [timeoutMs=9000] - per-call timeout
 * @param {number} [maxSteps=3] - max tool-call iterations
 * @returns {Promise<{reply: string, actions: Array, products: Array, meta: Object}>}
 */
async function runAssistant({ messages, tools, toolExecutor, timeoutMs = 9000, maxSteps = 3 }) {
  const conversation = [...messages];
  const allActions = [];
  let lastProducts = [];
  let finalReply = "";
  const toolCalls = [];

  const RETRY_DELAYS = [4000, 8000];

  for (let step = 0; step < maxSteps; step++) {
    let result;
    let lastErr;
    let attempt;

    for (attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      if (attempt > 0) {
        await sleep(RETRY_DELAYS[attempt - 1]);
      }
      try {
        result = await withTimeout(callGroq({ messages: conversation, tools }), timeoutMs);
        break;
      } catch (err) {
        lastErr = err;
        const msg = String(err.message || err);
        console.error(`[groq] step ${step} attempt ${attempt} ->`, msg.slice(0, 400));
        if (!RETRYABLE.test(msg)) break;
      }
    }

    if (!result) {
      const err = lastErr;
      const msg = String(err.message || "");
      if (/GROQ_API_KEY/.test(msg)) throw new GroqError("The AI assistant is not configured yet.", 503);
      if (/\(429\)/.test(msg)) throw new GroqError("The assistant is busy right now. Try again in a moment.", 503);
      if (/\(401\)|\(403\)/.test(msg)) throw new GroqError("The AI assistant is not configured correctly.", 503);
      if (err instanceof GroqError) throw err;
      throw new GroqError("The assistant is unavailable right now.", 503);
    }

    const choice = result.choices[0].message;

    // Append assistant message to conversation
    conversation.push(choice);

    // If no tool calls, LLM is done
    if (!choice.tool_calls || !choice.tool_calls.length) {
      finalReply = (choice.content || "").trim();
      break;
    }

    // Execute each tool call (usually just 1 for MVP)
    for (const tc of choice.tool_calls) {
      const name = tc.function.name;
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = {};
      }

      toolCalls.push(name);

      try {
        const executed = await toolExecutor(name, args);
        if (executed.actions && executed.actions.length) {
          allActions.push(...executed.actions);
        }
        if (executed.products && executed.products.length) {
          lastProducts = executed.products;
        }
        if (executed.reply) {
          finalReply = executed.reply;
        }

        // Append tool result to conversation so LLM can see it
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({
            ok: true,
            reply: executed.reply || "",
            actions: executed.actions || [],
            productsCount: (executed.products || []).length,
          }),
        });
      } catch (toolErr) {
        console.error(`[tool] ${name} error:`, toolErr);
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ ok: false, error: "Something went wrong. Please try again." }),
        });
      }
    }

    // If no tool returned a reply, use the message content as fallback
    if (!finalReply && choice.content) {
      finalReply = choice.content.trim();
    }
  }

  if (!finalReply) {
    finalReply = "Done.";
  }

  return {
    reply: finalReply,
    actions: allActions.slice(0, maxSteps),
    products: lastProducts,
    meta: { toolCalls, steps: toolCalls.length },
  };
}

module.exports = { runAssistant, GroqError };
