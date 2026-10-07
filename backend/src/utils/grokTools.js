const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// llama-3.3-70b-versatile is Groq's best tool-calling model
const GROQ_TOOL_MODEL = process.env.GROQ_TOOL_MODEL || 'llama-3.3-70b-versatile';

/**
 * Send messages + tool definitions to Groq.
 * Returns the raw choice object so callers can inspect
 * choice.finish_reason === 'tool_calls' and choice.message.tool_calls.
 */
async function callGrokWithTools(messages, tools = [], maxTokens = 800) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');

  const body = {
    model: GROQ_TOOL_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 0.3, // lower temp = more deterministic tool selection
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  try {
    const response = await axios.post(GROQ_API_URL, body, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    });

    const choice = response.data?.choices?.[0];
    if (!choice) {
      throw new Error('Groq returned a response without a choice');
    }
    return choice;
  } catch (error) {
    const status = error.response?.status;
    const providerMessage = error.response?.data?.error?.message;
    const details = [
      status ? `status=${status}` : null,
      error.code ? `code=${error.code}` : null,
      providerMessage ? `provider=${providerMessage}` : null,
      !status && !providerMessage ? `message=${error.message}` : null,
    ].filter(Boolean).join(' ');
    console.error(`[Groq tool request failed] model=${GROQ_TOOL_MODEL} ${details}`);
    throw error;
  }
}

module.exports = { callGrokWithTools };
