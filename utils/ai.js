// groq.js - Simple Groq API wrapper
const dotenv = require("dotenv");
dotenv.config();

const GROQ_CONFIG = {
  url: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama-3.3-70b-versatile", // Using Groq's best model
  // Other Groq models you could use:
  // 'llama-3.1-8b-instant'
  // 'mixtral-8x7b-32768'
  // 'gemma2-9b-it'
};

const defaultOptions = {
  temperature: 0.3,
  maxTokens: 1000,
  systemPrompt: "You are a helpful assistant.",
  format: "text", // 'text' or 'json'
};

/**
 * Main function to prompt Groq AI
 * @param {string} prompt - Your question/prompt
 * @param {object} options - Optional settings
 * @returns {Promise<string|object>} AI response
 */
async function promptGroq(prompt, options = {}) {
  // Merge defaults with user options
  const config = { ...defaultOptions, ...options };

  // Get API key from environment
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not found in .env file");
  }

  // Prepare the request body
  const body = {
    model: GROQ_CONFIG.model,
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };

  // If asking for JSON, tell Groq to return JSON
  if (config.format === "json") {
    body.response_format = { type: "json_object" };
  }

  // Make the API request
  const response = await fetch(GROQ_CONFIG.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Handle errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error (${response.status}): ${JSON.stringify(errorData)}`,
    );
  }

  // Extract the AI's response
  const data = await response.json();
  const content = data.choices[0].message.content;

  // If JSON format requested, parse it
  if (config.format === "json") {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  return content;
}

/**
 * Get structured JSON data from Groq
 * @param {string} prompt - Your question/prompt
 * @param {string} schemaDescription - Describe the JSON structure you want
 * @param {object} options - Optional settings
 * @returns {Promise<object>} Parsed JSON response
 */
async function promptGroqStructured(prompt, schemaDescription, options = {}) {
  const systemPrompt = [
    "You are a structured data extraction assistant.",
    "Respond only with valid JSON matching the schema below.",
    "Do not include markdown code blocks or extra text.",
    "",
    `Schema: ${schemaDescription}`,
  ].join("\n");

  const result = await promptGroq(prompt, {
    ...options,
    systemPrompt,
    format: "json",
  });

  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      throw new Error("Groq returned invalid JSON");
    }
  }

  return result;
}

/**
 * Stream responses from Groq (for real-time output)
 * @param {string} prompt - Your question/prompt
 * @param {object} options - Optional settings
 * @param {function} onChunk - Callback for each chunk of response
 * @returns {Promise<void>}
 */
async function promptGroqStream(prompt, options = {}, onChunk) {
  const config = { ...defaultOptions, ...options };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not found in .env file");
  }

  const body = {
    model: GROQ_CONFIG.model,
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: true, // Enable streaming
  };

  const response = await fetch(GROQ_CONFIG.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error (${response.status}): ${JSON.stringify(errorData)}`,
    );
  }

  // Process the stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content || "";
          if (content && onChunk) {
            onChunk(content);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

module.exports = {
  promptGroq,
  promptGroqStructured,
  promptGroqStream,
};
