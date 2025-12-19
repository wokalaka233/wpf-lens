import { RecognitionRule } from '../types';

const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export const loadModels = () => console.log("🧠 [系统]：智能视觉比对引擎已就绪");

export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  if (!ALI_API_KEY || rules.length === 0) return null;

  try {
    // 🛑 核心修改：重新构建规则库描述，让 URL 极其显眼
    const ruleContext = rules.map((r, i) => {
      return `[规则 ID: ${r.objectId || r.id}]
      - 核心识别名: ${r.name}
      - 视觉参考图(最高优先级): ${r.referenceImage || '无'}
      - 文字特征补充: ${r.targetValue}`;
    }).join('\n\n');

    const prompt = `你是一个具备人类直觉的顶级视觉判官。
你的唯一任务：判断【当前上传照片】是【规则库】中的哪一项。

【比对哲学】：
1. 视觉本质：忽略拍摄角度、光线、模糊、反光、背景。
2. 特征联想：参考图是物体的“身份证照”。即便现场照片拍得不全、光线暗，只要轮廓和关键零件（如鼠标按键、滚轮、支架、文字）对得上，必须判定为同一个物体。
3. 严禁较真：不要追求像素级一致，要追求“身份一致”。
4. 区分相似物：重点看 CD 封面的图案差异，以及物体的独特标记。

【规则库】：
${ruleContext}

【输出指令】：
- 仅输出匹配成功的 ID。
- 绝不匹配请输出 "NONE"。
- 严禁任何多余文字。`;

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
    
    // 🛑 调试：点开绿按钮看 AI 的真实回答
    console.log("------------------------------------");
    console.log("🧠 [AI 思考细节]：正在检索库中的参考图...");
    console.log("📝 [AI 判定 ID]：", aiText);
    console.log("------------------------------------");

    if (aiText.includes("NONE")) return null;

    // 智能提取 ID：从 AI 可能带符号的回复中捞出纯 ID
    const matched = rules.find(r => {
      const id = r.objectId || r.id;
      return aiText.toLowerCase().includes(id.toLowerCase());
    });

    return matched ? (matched.objectId || matched.id) : null;
  } catch (e) {
    console.error("AI 链路异常", e);
    return null;
  }
}
