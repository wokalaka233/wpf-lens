import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';
import { createWorker, Worker } from 'tesseract.js';
import { RecognitionRule } from '../types';

/* 
 * 🟢 100% FREE & LOCAL EXECUTION CONFIRMED (承诺：100% 免费且本地运行)
 * 
 * This service runs entirely in your browser using TensorFlow.js and Tesseract.js.
 * 这里的代码完全在您的浏览器中运行。
 * 
 * - No API Keys required (不需要 API Key).
 * - No data is sent to Google Gemini, OpenAI, or any cloud server (不发送数据到任何云端).
 * - All processing happens on your device's CPU/GPU (所有计算都在本地设备完成).
 * - Works offline once models are cached (模型加载后可离线使用).
 */

let mobileNetModel: mobilenet.MobileNet | null = null;
let ocrWorker: Worker | null = null;
let isModelLoading = false;

export const loadModels = async () => {
  if (mobileNetModel || isModelLoading) return;
  isModelLoading = true;
  try {
    console.log("[LocalAI] Loading TensorFlow.js...");
    await tf.ready();
    console.log("[LocalAI] Loading MobileNet...");
    // MobileNet v2 is a free, open-source model optimized for mobile devices
    mobileNetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log("[LocalAI] Models Loaded Successfully");
  } catch (error) {
    console.error("[LocalAI] Failed to load models:", error);
  } finally {
    isModelLoading = false;
  }
};

const getOcrWorker = async () => {
  if (ocrWorker) return ocrWorker;
  console.log("[LocalAI] Initializing OCR Worker...");
  try {
    // Tesseract.js is a free, open-source OCR library
    ocrWorker = await createWorker('eng');
    return ocrWorker;
  } catch (e) {
    console.error("[LocalAI] Failed to create OCR worker", e);
    return null;
  }
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (mA * mB);
};

export const extractEmbedding = async (imgElement: HTMLImageElement): Promise<number[] | null> => {
  if (!mobileNetModel) await loadModels();
  if (!mobileNetModel) {
    console.warn("[LocalAI] Model not ready for embedding extraction");
    return null;
  }
  try {
    const result = mobileNetModel.infer(imgElement, true);
    const data = await result.data();
    result.dispose();
    return Array.from(data);
  } catch (e) {
    console.error("[LocalAI] Embedding extraction failed", e);
    return null;
  }
};

export const analyzeImageLocal = async (
  base64Image: string,
  rules: RecognitionRule[]
): Promise<string | null> => {
  const imgElement = new Image();
  imgElement.src = base64Image;
  await new Promise((resolve, reject) => { 
    imgElement.onload = resolve; 
    imgElement.onerror = reject;
  });

  const hasOcrRules = rules.some(r => r.targetType === 'ocr');
  const hasImageRules = rules.some(r => r.targetType === 'image');
  const hasSimilarityRules = rules.some(r => r.targetType === 'similarity');

  let detectedText = "";
  let detectedObjects: string[] = [];
  let currentEmbedding: number[] | null = null;

  if (hasOcrRules) {
    try {
      const worker = await getOcrWorker();
      if (worker) {
        const { data: { text } } = await worker.recognize(base64Image);
        detectedText = text.toLowerCase();
      }
    } catch (e) {
      console.error("[LocalAI] OCR Failed", e);
      if (ocrWorker) {
        await ocrWorker.terminate();
        ocrWorker = null;
      }
    }
  }

  if (hasImageRules || hasSimilarityRules) {
    try {
      if (!mobileNetModel) await loadModels();
      if (mobileNetModel) {
        if (hasImageRules) {
          const predictions = await mobileNetModel.classify(imgElement);
          detectedObjects = predictions.flatMap(p => p.className.toLowerCase().split(', '));
        }
        if (hasSimilarityRules) {
          currentEmbedding = await extractEmbedding(imgElement);
        }
      }
    } catch (e) {
      console.error("[LocalAI] Vision Model Failed", e);
    }
  }

  for (const rule of rules) {
    if (rule.targetType === 'ocr') {
      const target = rule.targetValue.toLowerCase();
      if (detectedText.includes(target)) return rule.id;
    } else if (rule.targetType === 'image') {
      const target = rule.targetValue.toLowerCase();
      const match = detectedObjects.some(obj => obj.includes(target));
      if (match) return rule.id;
    } else if (rule.targetType === 'similarity' && rule.embedding && currentEmbedding) {
      const similarity = cosineSimilarity(rule.embedding, currentEmbedding);
      if (similarity >= rule.similarityThreshold) {
        return rule.id;
      }
    }
  }
  return null;
};