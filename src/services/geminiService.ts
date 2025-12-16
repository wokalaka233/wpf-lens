import { RecognitionRule } from '../types';

// ==============================================================================
// 阿里云 Key
const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
// ==============================================================================

// 阿里云直连地址
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  
  if (!ALI_API_KEY) {
    console.error("API Key 缺失");
    return null;
  }

  try {
    console.log("🐼 正在呼叫通义千问...");

    // 构建提示词
    const prompt = `
      你是一个视觉识别裁判。
      规则列表：
      ${rules.map(r => `- ID: ${r.id}, 目标: "${r.targetValue}"`).join('\n')}
      
      要求：
      1. 仔细看图。
      2. 如果图片包含规则里的目标（模糊匹配即可），只返回该规则的 ID。
      3. 如果都不匹配，请返回 "NO_MATCH"。
      4. 不要解释，不要多说话。
    `;

    // 发送请求
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ALI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen-vl-plus", 
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: base64Image } }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      console.error("网络请求失败", response.status);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error("阿里云报错:", data.error);
      return null;
    }

    const aiText = data.choices?.[0]?.message?.content?.trim();
    console.log("🐼 AI回答:", aiText);

    if (!aiText || aiText.includes("NO_MATCH")) return null;

    // 1. 优先匹配 ID
    const matchedRule = rules.find(r => aiText.includes(r.id));
    if (matchedRule) return matchedRule.id;

    // 2. 备用：匹配关键词
    const fuzzyMatch = rules.find(r => r.targetValue && aiText.includes(r.targetValue));
    if (fuzzyMatch) return fuzzyMatch.id;

    return null;

  } catch (e: any) {
    console.error("运行出错:", e);
    return null;
  }
}

export async function loadModels() {}
export async function extractEmbedding() { return null; }
