const axios = require("axios");
require("dotenv").config();

async function test() {
  try {
    const res = await axios.get("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
    });
    console.log(res.data.data.map(m => m.id).filter(id => id.includes('vision')));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
