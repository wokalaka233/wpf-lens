import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import Tesseract from 'tesseract.js';
import { RecognitionRule } from '../types';

let model: mobilenet.MobileNet | null = null;
let isModelLoading = false;

// 1. 加载模型 (增加防重复加载逻辑)
export async function loadModels() {
  if (model) return; // 已经有了就不加载
  if (isModelLoading) {
    // 如果正在加载，等待它完成
    console.log("⏳ 模型正在加载中，请稍候...");
    while (isModelLoading) {
      await new Promise(r => setTimeout(r, 500));
      if (model) return;
    }
    return;
  }

  isModelLoading = true;
  console.log("🚀 开始下载本地 AI 模型...");
  
  try {
    await tf.ready();
    // version 2, alpha 1.0 是精度和速度的平衡点
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log("✅ MobileNet 模型加载完毕！现在可以识别了。");
  } catch (e) {
    console.error("❌ 模型加载失败 (请检查网络):", e);
  } finally {
    isModelLoading = false;
  }
}

// 辅助：图片转元素
async function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 关键：处理跨域问题，防止 canvas 污染
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
}

// 2. 提取特征 (增强健壮性)
export async function extractEmbedding(image: HTMLImageElement): Promise<number[] | null> {
  console.log("🧬 正在尝试提取图片特征...");
  
  if (!model) {
    console.log("⚠️ 模型未就绪，正在强制加载...");
    await loadModels();
  }
  
  if (!model) {
    console.error("❌ 无法加载模型，特征提取失败。");
    return null;
  }

  try {
    // infer(image, true) 返回的是中间层特征 (Embedding)
    const embedding = model.infer(image, true);
    const data = await embedding.data();
    embedding.dispose(); // 释放显存
    
    if (data.length > 0) {
      console.log(`✅ 特征提取成功，长度: ${data.length}`);
      // 为了性能和存储，我们取前 100 个特征点即可
      return Array.from(data).slice(0, 100); 
    } else {
      console.error("❌ 提取到了空特征");
      return null;
    }
  } catch (e) {
    console.error("❌ 特征提取过程出错:", e);
    return null;
  }
}

// 计算余弦相似度
function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

// 3. 核心分析逻辑
export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  const imgElement = await createImageElement(base64Image);
  
  // A. 先跑 OCR
  const hasOCRRule = rules.some(r => r.targetType === 'ocr');
  if (hasOCRRule) {
    try {
      const { data: { text } } = await Tesseract.recognize(base64Image, 'eng');
      console.log("OCR 文本:", text);
      const ocrMatch = rules.find(r => 
        r.targetType === 'ocr' && text.toLowerCase().includes(r.targetValue.toLowerCase())
      );
      if (ocrMatch) return ocrMatch.id;
    } catch(e) { console.error("OCR 出错:", e); }
  }

  // B. 确保模型加载
  if (!model) await loadModels();
  if (!model) return null;

  // C. 物体识别 & 比对
  try {
    const predictions = await model.classify(imgElement);
    console.log("👁️ AI 看到的物体:", predictions);

    // 1. 匹配物体 (Image Type)
    const imageMatch = rules.find(r => {
      if (r.targetType !== 'image') return false;
      return predictions.some(p => p.className.toLowerCase().includes(r.targetValue.toLowerCase()));
    });
    if (imageMatch) return imageMatch.id;

    // 2. 匹配相似度 (Similarity Type)
    const embedding = await extractEmbedding(imgElement);
    if (embedding) {
      const simRules = rules.filter(r => r.targetType === 'similarity' && r.embedding);
      for (const rule of simRules) {
        if (rule.embedding) {
          const sim = cosineSimilarity(embedding, rule.embedding);
          // 在控制台打印相似度，方便你调试阈值
          console.log(`📊 与 [${rule.name}] 的相似度: ${(sim * 100).toFixed(1)}%`);
          
          const threshold = rule.similarityThreshold || 0.85;
          if (sim > threshold) return rule.id;
        }
      }
    }
  } catch (e) {
    console.error("分析出错:", e);
  }

  return null;
}
