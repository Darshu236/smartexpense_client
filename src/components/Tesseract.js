import Tesseract from 'tesseract.js';

const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
  logger: m => updateProgress(m.status)
});