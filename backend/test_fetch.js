require('dotenv').config();
const { callHuggingFace } = require('./src/utils/huggingface.js');
const { callGrokVision } = require('./src/utils/grok.js');

async function testHF() {
  try {
    await callHuggingFace([{ role: 'user', content: 'test' }]);
    console.log('HF succeeded');
  } catch (e) {
    console.error('HF Error:', e.message);
  }
}

async function testGrok() {
  try {
    // pass a tiny 1x1 png in base64
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await callGrokVision(base64Image, 'image/png', 'test');
    console.log('Grok succeeded');
  } catch (e) {
    console.error('Grok Error:', e.message);
  }
}

async function main() {
  await testHF();
  await testGrok();
}
main();
