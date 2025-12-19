import { RecognitionRule } from '../types';

const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  if (!ALI_API_KEY) return null;

  try {
    // 🛑 核心升级：同时把规则的文字描述和参考图链接喂给 AI
    const ruleContext = rules.map((r, i) => {
      let desc = `规则${i+1}: [ID: ${r.objectId || r.id}], 核心名称: "${r.name}", 文字特征: "${r.targetValue}"`;
      if (r.referenceImage) {
        desc += `, 视觉比对参考图: ${r.referenceImage}`;
      }
      return desc;
    }).join('\n');

    const prompt = `
      你是一个顶级的视觉比对裁判。
      任务：判断【当前照片】与【规则库】中的哪一项是同一个物体。

      【规则库内容】：
      ${ruleContext}

      【判定准则】：
      1. 如果规则提供了[视觉比对参考图]，请将其作为最高权重的比对基准。
      2. 严格区分生物与非生物：如果是【狗】，严禁匹配到【人类】；如果是【架子鼓】，必须看到支架和镲片。
      3. 严格区分不同款式的同类物：如果两张 CD 封面文字或构图不同，严禁混淆。
      4. 只有当相似度极高且逻辑完全自洽时，才返回对应的 ID。
      5. 如果都不匹配，必须返回 "NONE"。
      6. 只准输出匹配的 ID 字符串，严禁任何额外解释。
    `;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${ALI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-vl-plus", 
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }]
      })
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();
    
    if (!aiResponse || aiResponse.includes("NONE")) return null;

    // 提取并匹配 ID
    const matched = rules.find(r => aiResponse.includes(r.objectId || r.id));
    return matched ? (matched.objectId || matched.id) : null;

  } catch (e) {
    console.error("AI 识别链路异常:", e);
    return null;
  }
}

export async function loadModels() {}
export async function extractEmbedding() { return null; }
