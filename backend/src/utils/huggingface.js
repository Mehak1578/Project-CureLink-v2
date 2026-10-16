const axios = require('axios');

const HF_TOKEN = process.env.HF_TOKEN;
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';

/**
 * Sends a conversation or prompt to Hugging Face Inference API.
 */
async function callHuggingFace(messages, maxTokens = 500) {
  if (!HF_TOKEN) {
    throw new Error('HF_TOKEN is not set in environment variables');
  }

  try {
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : msg.role,
      content: msg.content
    }));

    const response = await axios.post(
      'https://router.huggingface.co/v1/chat/completions',
      {
        model: HUGGINGFACE_MODEL,
        messages: formattedMessages,
        max_tokens: maxTokens,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message;
    console.error('Hugging Face API Error:', errorMsg);
    throw new Error(typeof errorMsg === 'string' ? errorMsg : 'Failed to communicate with Hugging Face AI');
  }
}

module.exports = { callHuggingFace };
