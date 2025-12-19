import { RecognitionRule } from '../types';

const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  if (!ALI_API_KEY || rules.length === 0) return null;

  try {
    const ruleContext = rules.map((r, i) => {
      return `【规则库 ${i+1}】ID: "${r.objectId || r.id}", 名称: "${r.name}", 描述: "${r.targetValue}", 参考图: ${r.referenceImage || '无'}`;
    }).join('\n');

    const prompt = `你是一个顶级视觉判官。请分析图片并匹配规则库。规则库：\n${ruleContext}\n准则：忽略角度和背景。如果是狗，绝不认为人。只需返回匹配成功的 ID。不匹配返回 NONE。`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${ALI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-vl-plus", 
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: base64Image } }] }]
      })
    });

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content?.trim() || "";
    
    // 🛑 核心功能：让你在控制台只看到真实的思考结果
    console.log("------------------------------------");
    console.log("🧠 [AI 思考过程]：我在图中看到了物体，正在检索...");
    console.log("📝 [AI 最终判定]：", aiText);
    console.log("------------------------------------");

    if (aiText.includes("NONE")) return null;
    const matched = rules.find(r => aiText.toLowerCase().includes((r.objectId || r.id).toLowerCase()));
    return matched ? (matched.objectId || matched.id) : null;
  } catch (e) { return null; }
}
