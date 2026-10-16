const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  process.env.GROQ_TOOL_MODEL ||
  'openai/gpt-oss-120b';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || GROQ_MODEL;

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

  // Since Groq vision models are unavailable on this tier and openai/gpt-oss-120b is a text model,
  // we extract the text locally using Tesseract and pass the raw text to the model for refinement.
  const Tesseract = require('tesseract.js');
  const path = require('path');
  const { data: { text: rawOcrText } } = await Tesseract.recognize(
    `data:${mimeType};base64,${base64Image}`,
    'eng'
  );

  const prompt = `${textPrompt}\n\n[Raw OCR text from the image]:\n${rawOcrText}`;

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_VISION_MODEL,
      messages: [{ role: 'user', content: prompt }],
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
