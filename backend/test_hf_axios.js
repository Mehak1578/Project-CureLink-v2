const axios = require("axios");
require("dotenv").config();

async function test() {
  try {
    const res = await axios.post("https://api-inference.huggingface.co/models/Qwen/Qwen2-VL-7B-Instruct/v1/chat/completions", {
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
    }, {
      headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` }
    });
    console.log(res.data.choices[0].message.content);
  } catch (e) {
    console.error("ERROR:", e.response ? e.response.data : e.message);
  }
}
test();
