const { HfInference } = require('@huggingface/inference');

const HF_TOKEN = process.env.HF_TOKEN;
// Use a free lightweight model supported by Hugging Face Serverless Inference API
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || 'HuggingFaceH4/zephyr-7b-beta';

const hf = new HfInference(HF_TOKEN);

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

    const response = await hf.chatCompletion({
      model: HUGGINGFACE_MODEL,
      messages: formattedMessages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Hugging Face API Error:', error.message);
    throw new Error(error.message || 'Failed to communicate with Hugging Face AI');
  }
}

module.exports = { callHuggingFace };
