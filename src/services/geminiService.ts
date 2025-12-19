import { RecognitionRule } from '../types';

const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  if (!ALI_API_KEY || rules.length === 0) return null;

  try {
    // 1. 构建高度结构化的规则库，明确告知 AI 哪些是图片证据
    const ruleContext = rules.map((r, i) => {
      return `【规则库编号 ${i+1}】
      - ID标记: "${r.objectId || r.id}"
      - 物品名称: "${r.name}"
      - 核心视觉证据(URL): ${r.referenceImage || '无图片，参考文字描述'}
      - 文字细节描述: "${r.targetValue}"
      ----------------------------------`;
    }).join('\n');

    const prompt = `
      你是一个顶级的视觉比对专家，现在正在进行“物体身份确认”任务。
      
      【任务指令】：
      请将用户上传的【现场照片】与下方【规则库】中的每一个“核心视觉证据(URL)”进行视觉特征比对。

      【判定哲学】：
      1. 灵魂匹配：请忽略角度、反光、模糊、光线和背景。你是在寻找物体的“本质”。
      2. 证据权重：参考图 URL 里的视觉特征（构图、Logo、颜色、文字）权重最高。只要现场照片展示了参考图中 40% 以上的关键特征，即可判定匹配。
      3. 宽容比对：如果用户拍的是侧面，而参考图是正面，但只要 CD 的封面色块一致，或者架子鼓的支架结构一致，必须返回 ID。
      4. 严禁严苛：不要像质检员一样较真，要像人类一样通过“直觉”去识别。
      
      【规则库】：
      ${ruleContext}

      【输出格式】：
      你必须且只能输出匹配成功的“ID标记”字符串。如果没有一个能对上，输出 "NONE"。禁止解释。
    `;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ALI_API_KEY}`,
        "Content-Type": "application/json"
      },
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
    const aiText = data.choices?.[0]?.message?.content?.trim() || "";
    
    console.log("🐼 灵犀后台监控 - AI原始回答:", aiText);

    // 🛑 核心逻辑改进：不仅是简单的 trim()，我们要从 AI 的胡言乱语中“捞出” ID
    if (aiText.includes("NONE")) return null;

    // 遍历规则库，看 AI 的回答里是否包含了任何一个 ID
    const matched = rules.find(r => {
      const id = r.objectId || r.id;
      return aiText.toLowerCase().includes(id.toLowerCase());
    });

    return matched ? (matched.objectId || matched.id) : null;

  } catch (e) {
    console.error("识别链路崩了:", e);
    return null;
  }
}

export async function loadModels() {}
export async function extractEmbedding() { return null; }
