import { RecognitionRule } from '../types';

const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

// 🛑 核心修复：补全 loadModels 导出，解决部署报错
export const loadModels = () => {
  console.log("🧠 [系统]：视觉分析引擎已就绪");
};

export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  if (!ALI_API_KEY || rules.length === 0) return null;

  try {
    const ruleContext = rules.map((r, i) => {
      return `【规则 ${i+1}】ID: "${r.objectId || r.id}", 描述: "${r.targetValue}", 参考图URL: ${r.referenceImage || '无'}`;
    }).join('\n');

    const prompt = `你是一个顶级视觉判官。分析照片并匹配规则。只需返回匹配成功的 ID，不匹配返回 NONE。禁止解释。\n规则库：\n${ruleContext}`;

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
    
    // 🛑 纯净调试模式：在 vConsole 中只输出核心思考
    console.log("------------------------------------");
    console.log("🧠 [AI 思考过程]：正在比对当前画面与规则库...");
    console.log("📝 [分析判定结果]：", aiText);
    console.log("------------------------------------");

    if (aiText.includes("NONE")) return null;
    const matched = rules.find(r => aiText.toLowerCase().includes((r.objectId || r.id).toLowerCase()));
    return matched ? (matched.objectId || matched.id) : null;
  } catch (e) {
    console.log("❌ [AI 异常]：请求失败");
    return null;
  }
}
