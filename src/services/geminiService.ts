import { RecognitionRule } from '../types';

// ==============================================================================
// 阿里云 Key
const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
// ==============================================================================

// ⚠️ 调试重点：我们先去掉代理，尝试直连！看看到底是不是代理的问题
// 如果直连报错 CORS，我们再换回代理。
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  
  // 1. 弹窗测试：证明函数跑起来了
  // alert("步骤1: 开始分析..."); 

  try {
    const prompt = `
      你是一个视觉识别裁判。
      规则列表：
      ${rules.map(r => `- ID: ${r.id}, 目标: "${r.targetValue}"`).join('\n')}
      
      要求：
      1. 仔细看图。
      2. 如果图片包含规则里的目标，只返回该规则的 ID。
      3. 如果都不匹配，请返回 "NO_MATCH: 原因"。
      4. 不要解释。
    `;

    // 2. 发送请求
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

    // 3. 检查网络状态
    if (!response.ok) {
      const errText = await response.text();
      alert(`❌ 网络错误: ${response.status}\n详细信息: ${errText.slice(0, 100)}`);
      return null;
    }

    const data = await response.json();

    // 4. 检查阿里云返回
    if (data.error) {
      alert(`❌ 阿里云报错: ${data.error.message}`);
      return null;
    }

    const aiText = data.choices?.[0]?.message?.content?.trim();
    
    // 5. ⭐️ 关键弹窗：看看 AI 到底说了什么！
    alert(`🤖 AI说: [${aiText}]`);

    if (!aiText || aiText.includes("NO_MATCH")) return null;

    // 尝试匹配 ID
    const matchedRule = rules.find(r => aiText.includes(r.id));
    
    if (matchedRule) {
      return matchedRule.id;
    } else {
      // 如果 AI 说了一堆话但没报 ID，尝试模糊匹配
      const fuzzyMatch = rules.find(r => aiText.includes(r.targetValue));
      if (fuzzyMatch) return fuzzyMatch.id;
      
      alert(`⚠️ 匹配失败。AI虽然回答了，但没对上 ID。`);
      return null;
    }

  } catch (e: any) {
    alert(`💥 程序崩溃: ${e.message}`);
    return null;
  }
}

export async function loadModels() {}
export async function extractEmbedding() { return null; }
