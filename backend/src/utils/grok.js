const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

async function callGrok(messages, maxTokens = 500) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');
  const response = await axios.post(
    GROQ_API_URL,
    { model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature: 0.7 },
    {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );
  return response.data.choices[0].message.content;
}

async function callGrokVision(base64Image, mimeType, textPrompt, maxTokens = 900) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');
  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          { type: 'text', text: textPrompt },
        ],
      }],
      max_tokens: maxTokens,
      temperature: 0.7,
    },
    {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: 60000,
    }
  );
  return response.data.choices[0].message.content;
}

module.exports = { callGrok, callGrokVision };
