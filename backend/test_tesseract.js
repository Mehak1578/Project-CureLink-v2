const Tesseract = require('tesseract.js');
async function test() {
  try {
    const { data: { text } } = await Tesseract.recognize(
      'https://tesseract.projectnaptha.com/img/eng_bw.png',
      'eng'
    );
    console.log(text);
  } catch (e) {
    console.error(e.message);
  }
}
test();
