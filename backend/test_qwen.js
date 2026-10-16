const { HfInference } = require('@huggingface/inference');
require("dotenv").config();
const hf = new HfInference(process.env.HF_TOKEN);

async function test() {
  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2-VL-7B-Instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            { type: "image_url", image_url: { url: "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers/tasks/car.jpg" } }
          ]
        }
      ],
      max_tokens: 50
    });
    console.log(response.choices[0].message.content);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
test();
