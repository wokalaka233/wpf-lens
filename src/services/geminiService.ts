import { RecognitionRule } from '../types';

// ==============================================================================
// ✅ 已填入你的阿里云 API Key (通义千问)
const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
// ==============================================================================

// 使用公共代理绕过阿里云的 CORS 限制 (必加，否则手机网页会报错)
const PROXY_URL = "https://cors-anywhere.herokuapp.com/";
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

// 1. 核心分析函数
export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  
  if (!ALI_API_KEY) {
    alert("API Key 缺失！");
    return null;
  }

  try {
    console.log("🐼 正在呼叫通义千问 (Qwen-VL)...");

    // 构建提示词：让 AI 做中文裁判
    const prompt = `
      你是一个视觉识别裁判。请判断这张图片是否符合以下规则中的任何一条。
      
      规则列表：
      ${rules.map(r => `- ID: ${r.id}, 类型: ${r.targetType === 'ocr' ? '包含文字' : '包含物体'}, 目标描述: "${r.targetValue}"`).join('\n')}
      
      要求：
      1. 仔细观察图片内容。
      2. 如果图片符合某条规则的描述（即使目标值是英文，只要画面里有这个东西就算），请只返回该规则的 ID。
      3. 如果都不符合，请返回 "null"。
      4. 不要解释，不要多说话，直接给 ID。
    `;

    // 发送请求
    const response = await fetch(PROXY_URL + API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ALI_API_KEY}`,
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest" // 代理服务需要这个头
      },
      body: JSON.stringify({
        model: "qwen-vl-plus", // 使用通义千问 VL 增强版
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

    const data = await response.json();

    // 错误处理
    if (data.error) {
      console.error("阿里云报错:", data.error);
      return null;
    }

    // 获取 AI 的回答
    const aiText = data.choices?.[0]?.message?.content?.trim();
    console.log("🐼 通义千问回答:", aiText);

    if (!aiText || aiText === "null" || aiText.includes("null")) return null;

    // 匹配 ID
    const matchedRule = rules.find(r => aiText.includes(r.id));
    return matchedRule ? matchedRule.id : null;

  } catch (e) {
    console.error("请求失败:", e);
    // 第一次使用代理可能需要激活，这里给个友好提示
    if (e.toString().includes("403")) {
      alert("请先访问 https://cors-anywhere.herokuapp.com/corsdemo 点击按钮激活代理服务（开发者只需做一次）");
    }
    return null;
  }
}

// 兼容代码
export async function loadModels() { console.log("云端模式就绪"); }
export async function extractEmbedding(image: any) { return null; }
