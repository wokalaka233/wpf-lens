import { RecognitionRule } from '../types';

// ==============================================================================
// ✅ 已自动填入你的阿里云 API Key
const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
// ==============================================================================

// 通义千问的 API 地址 (兼容 OpenAI 格式)
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

// 1. 核心分析函数 (连接阿里云 Qwen-VL)
export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  
  if (!ALI_API_KEY) {
    alert("API Key 缺失！");
    return null;
  }

  try {
    console.log("🐼 正在呼叫通义千问 (Qwen-VL)...");

    // 构建提示词：让 AI 做选择题
    const prompt = `
      你是一个视觉识别裁判。请判断这张图片是否符合以下规则中的任何一条。
      
      规则列表：
      ${rules.map(r => `- ID: ${r.id}, 类型: ${r.targetType === 'ocr' ? '文字内容' : '物体描述'}, 目标: "${r.targetValue}"`).join('\n')}
      
      要求：
      1. 仔细观察图片内容。
      2. 如果图片符合某条规则的描述，请只返回该规则的 ID。
      3. 如果都不符合，请返回 "null"。
      4. 不要解释，不要多说话，直接给 ID。
    `;

    // 发送请求给阿里云
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ALI_API_KEY}`,
        "Content-Type": "application/json"
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
      if (data.error.code === 'AccessDenied') {
        alert("请求被拒绝！请检查阿里云控制台是否配置了 CORS (跨域) 允许 *");
      }
      return null;
    }

    // 获取 AI 的回答
    const a
