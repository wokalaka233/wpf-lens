import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { RecognitionRule } from '../types';

let model: mobilenet.MobileNet | null = null;

// 1. 加载模型 (这是真模型，会下载约 20MB 数据到浏览器)
export async function loadModels() {
  console.log("正在加载本地 TensorFlow 模型...");
  try {
    // 这一步必须保证 package.json 里安装了 @tensorflow/tfjs 和 @tensorflow-models/mobilenet
    await tf.ready(); 
    model = await mobilenet.load({
      version: 2,
      alpha: 1.0
    });
    console.log("✅ 本地 AI 模型加载成功！");
  } catch (e) {
    console.error("❌ 模型加载失败:", e);
  }
}

// 2. 辅助函数：将 Base64 转换为图片对象
async function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
}

// 3. 提取特征 (这里用 MobileNet 的中间层作为特征，用于相似度比对)
export async function extractEmbedding(image: HTMLImageElement): Promise<number[] | null> {
  if (!model) await loadModels();
  if (!model) return null;

  try {
    // MobileNet 的 infer 方法可以返回特征向量
    const embedding = model.infer(image, true); 
    // 将 tensor 转换为普通数组
    const data = await embedding.data();
    embedding.dispose(); // 释放内存
    return Array.from(data).slice(0, 100); // 截取前100位作为简化特征
  } catch (e) {
    console.error("特征提取失败:", e);
    return null;
  }
}

// 4. 核心分析函数 (真·识别)
export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  if (!model) {
    await loadModels();
    if (!model) return null; // 如果模型还没加载好，无法识别
  }

  try {
    console.log("🔍 开始本地分析...");
    const imgElement = await createImageElement(base64Image);
    
    // 让 AI 看看图里有什么 (返回前 3 个可能的结果)
    const predictions = await model.classify(imgElement);
    console.log("🤖 AI 看到的物体:", predictions);

    // --- 匹配逻辑 ---
    for (const rule of rules) {
      // 模式 A: 物体识别 (Image Classification)
      if (rule.targetType === 'image' || rule.targetType === 'ocr') {
        // MobileNet 只能识别物体，不能识别 OCR 文字，所以我们把 OCR 规则也暂时当物体匹配用
        // 检查 AI 的预测结果里，是否包含规则里写的英文单词
        const match = predictions.find(p => 
          p.className.toLowerCase().includes(rule.targetValue.toLowerCase())
        );
        
        if (match && match.probability > 0.1) { // 如果置信度 > 10%
          console.log(`✅ 匹配成功: ${rule.name} (识别为: ${match.className})`);
          return rule.id;
        }
      }
      
      // 模式 B: 相似度比对 (Similarity)
      // *注意：纯前端做精确的相似度比对很难，这里主要靠物体分类的一致性*
    }

    console.log("❌ 未找到匹配规则");
    return null;

  } catch (e) {
    console.error("分析过程出错:", e);
    return null;
  }
}
