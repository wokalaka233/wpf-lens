import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import Tesseract from 'tesseract.js';
import { RecognitionRule } from '../types';

let model: mobilenet.MobileNet | null = null;

// 1. 加载模型
export async function loadModels() {
  console.log("🚀 正在加载 AI 模型...");
  try {
    await tf.ready();
    // 加载 MobileNet (用于物体识别)
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log("✅ MobileNet 模型加载完毕");
  } catch (e) {
    console.error("❌ 模型加载失败:", e);
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

// 2. 提取特征 (用于相似度比对)
export async function extractEmbedding(image: HTMLImageElement): Promise<number[] | null> {
  if (!model) await loadModels();
  if (!model) return null;
  try {
    // 获取中间层特征
    const embedding = model.infer(image, true); 
    const data = await embedding.data();
    embedding.dispose();
    return Array.from(data);
  } catch (e) {
    console.error("特征提取失败", e);
    return null;
  }
}

// 计算余弦相似度
function cosineSimilarity(a: number[], b: number[]) {
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

// 3. 核心分析逻辑 (包含 OCR 和 物体识别)
export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  const imgElement = await createImageElement(base64Image);
  
  // --- A. 先跑 OCR (文字识别) ---
  // 如果有 OCR 类型的规则，才去跑 Tesseract (因为它比较慢)
  const hasOCRRule = rules.some(r => r.targetType === 'ocr');
  if (hasOCRRule) {
    console.log("📖 正在进行 OCR 文字识别...");
    const { data: { text } } = await Tesseract.recognize(base64Image, 'eng'); // 默认识别英文数字
    console.log("OCR 结果:", text);
    
    // 匹配文字规则
    const ocrMatch = rules.find(r => 
      r.targetType === 'ocr' && 
      text.toLowerCase().includes(r.targetValue.toLowerCase())
    );
    if (ocrMatch) return ocrMatch.id;
  }

  // --- B. 再跑 MobileNet (物体识别) ---
  if (!model) await loadModels();
  if (model) {
    console.log("🔍 正在进行物体分析...");
    
    // 1. 获取分类标签 (Top 3)
    const predictions = await model.classify(imgElement);
    console.log("AI 看到的物体:", predictions); // 👈 在控制台看这个很重要！

    // 2. 匹配物体规则 (Image Type)
    const imageMatch = rules.find(r => {
      if (r.targetType !== 'image') return false;
      // 检查 AI 预测的 className 是否包含你填写的单词
      return predictions.some(p => p.className.toLowerCase().includes(r.targetValue.toLowerCase()));
    });
    if (imageMatch) return imageMatch.id;

    // 3. 匹配相似度规则 (Similarity Type)
    const embedding = await extractEmbedding(imgElement);
    if (embedding) {
      // 找到所有相似度类型的规则
      const simRules = rules.filter(r => r.targetType === 'similarity' && r.embedding);
      
      for (const rule of simRules) {
        if (rule.embedding) {
          const sim = cosineSimilarity(embedding, rule.embedding);
          console.log(`与规则 [${rule.name}] 的相似度:`, sim);
          
          // 这里的阈值 (threshold) 可以在后台设置，默认建议 0.8 以上
          const threshold = rule.similarityThreshold || 0.85;
          if (sim > threshold) {
            return rule.id;
          }
        }
      }
    }
  }

  return null;
}
