import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Tesseract from 'tesseract.js';
import { RecognitionRule } from '../types';

let mobilenetModel: mobilenet.MobileNet | null = null;
let cocoModel: cocoSsd.ObjectDetection | null = null;
let isLoading = false;

// 1. 同时加载两个 AI 模型
export async function loadModels() {
  if (mobilenetModel && cocoModel) return;
  if (isLoading) return; // 防止重复加载
  
  isLoading = true;
  console.log("🚀 正在启动双引擎 AI...");
  
  try {
    await tf.ready();
    
    // 并行加载，速度更快
    const [mNet, cSsd] = await Promise.all([
      mobilenet.load({ version: 2, alpha: 1.0 }),
      cocoSsd.load()
    ]);
    
    mobilenetModel = mNet;
    cocoModel = cSsd;
    console.log("✅ MobileNet (识物) + COCO-SSD (识人) 全部就绪！");
  } catch (e) {
    console.error("❌ 模型加载失败:", e);
  } finally {
    isLoading = false;
  }
}

// 辅助：图片转元素
async function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
}

// 2. 核心分析逻辑 (三层过滤)
export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  const imgElement = await createImageElement(base64Image);
  if (!mobilenetModel || !cocoModel) await loadModels();

  // --- 第 1 层：OCR 文字识别 (专门用于区分不同的 CD/书) ---
  const hasOCRRule = rules.some(r => r.targetType === 'ocr');
  if (hasOCRRule) {
    try {
      console.log("📖 [1/3] 正在阅读文字...");
      const { data: { text } } = await Tesseract.recognize(base64Image, 'eng');
      console.log("OCR 结果:", text);
      const ocrMatch = rules.find(r => 
        r.targetType === 'ocr' && text.toLowerCase().includes(r.targetValue.toLowerCase())
      );
      if (ocrMatch) {
        console.log(`✅ 文字匹配成功: ${ocrMatch.name}`);
        return ocrMatch.id;
      }
    } catch(e) {}
  }

  // --- 第 2 层：COCO-SSD 检测 (专门找人、自行车、蛋糕) ---
  if (cocoModel) {
    try {
      console.log("👥 [2/3] 正在扫描人类和常见物体...");
      const detections = await cocoModel.detect(imgElement);
      const detectedClasses = detections.map(d => d.class.toLowerCase());
      console.log("COCO 看到了:", detectedClasses);

      const cocoMatch = rules.find(r => {
        if (r.targetType !== 'image') return false;
        // 只要包含了规则里的词
        return detectedClasses.some(cls => cls.includes(r.targetValue.toLowerCase()));
      });
      if (cocoMatch) {
        console.log(`✅ COCO 匹配成功: ${cocoMatch.name}`);
        return cocoMatch.id;
      }
    } catch(e) { console.error(e); }
  }

  // --- 第 3 层：MobileNet 分类 (专门找生僻物体：台球杆、架子鼓) ---
  if (mobilenetModel) {
    try {
      console.log("🎱 [3/3] 正在分析具体细节...");
      const predictions = await mobilenetModel.classify(imgElement);
      console.log("MobileNet 看到了:", predictions);

      const mobileMatch = rules.find(r => {
        if (r.targetType !== 'image') return false;
        return predictions.some(p => p.className.toLowerCase().includes(r.targetValue.toLowerCase()));
      });
      if (mobileMatch) {
        console.log(`✅ MobileNet 匹配成功: ${mobileMatch.name}`);
        return mobileMatch.id;
      }
    } catch(e) { console.error(e); }
  }

  return null;
}

// 占位
export async function extractEmbedding() { return null; }
