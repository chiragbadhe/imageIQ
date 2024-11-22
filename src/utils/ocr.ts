import Tesseract from "tesseract.js";

export async function extractTextFromImage(imagePath: string): Promise<string> {
  console.log(`[OCR]: Initializing Tesseract.js worker`);
  const worker = await Tesseract.createWorker();
  await worker.load('eng');
  await worker.reinitialize('eng');
  console.log(`[OCR]: Worker initialized. Starting recognition`);
  const { data } = await worker.recognize(imagePath);
  console.log(`[OCR]: Recognition complete`);
  await worker.terminate();
  console.log(`[OCR]: Worker terminated`);
  return data.text;
} 