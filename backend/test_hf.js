const { HfInference } = require('@huggingface/inference');
require("dotenv").config();
const hf = new HfInference(process.env.HF_TOKEN);

async function test() {
  try {
    const response = await hf.chatCompletion({
      model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
          ]
        }
      ],
      max_tokens: 50
    });
    console.log(response.choices[0].message.content);
  } catch (e) {
    console.error(e.message);
  }
}
test();
