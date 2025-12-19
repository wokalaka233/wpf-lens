import { RecognitionRule } from '../types';

const ALI_API_KEY = "sk-2a663c4452024b0498044c4c8c31f66d"; 
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export async function analyzeImageLocal(base64Image: string, rules: RecognitionRule[]): Promise<string | null> {
  if (!ALI_API_KEY) return null;

  try {
    const ruleContext = rules.map((r, i) => {
      let desc = `规则${i+1}: [ID: ${r.objectId || r.id}], 物品名: "${r.name}", 核心特征: "${r.targetValue}"`;
      if (r.referenceImage) {
        desc += `, 视觉身份参考图: ${r.referenceImage}`;
      }
      return desc;
    }).join('\n');

    const prompt = `
      你是一个极具洞察力的视觉识别专家，拥有极强的抗干扰比对能力。
      
      任务：分析【当前照片】，在【规则库】中找出对应的物品。

      【识别哲学（必须遵守）】：
      1. 视觉本质优先：参考图仅代表物品的“身份”。请彻底忽略拍摄角度（侧拍、俯拍、斜拍）、光线（极暗、曝光）、背景杂乱、以及是否有人手持。
      2. 提取核心锚点：重点寻找物品的颜色组合、独特形状、Logo、或是封面文字。
      3. 语义联想：如果用户拍的照片很模糊，但能看出大体轮廓和颜色与某规则的[视觉身份参考图]及其[核心特征]吻合，请大胆判定匹配。
      4. 严格分类，模糊比对：你可以容忍角度变化，但不能混淆内容。例如，识别CD时，只要确认是同一张专辑封面即可，不必管封面是否反光或折皱。
      5. 宁错莫漏（保持适度灵敏）：只要有 60% 以上的把握确认是同一个物体，就返回 ID。

      【规则库】：
      ${ruleContext}

      【输出规范】：
      - 仅输出匹配成功的 ID 字符串。
      - 若图中物体在库中完全没有任何相关痕迹，输出 "NONE"。
      - 严禁任何解释说明。
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
    const aiText = data.choices?.[0]?.message?.content?.trim();
    
    // 增加一层容错过滤
    if (!aiText || aiText.includes("NONE") || aiText.length > 50) return null;

    const matched = rules.find(r => aiText.includes(r.objectId || r.id));
    return matched ? (matched.objectId || matched.id) : null;

  } catch (e) {
    console.error("识别引擎异常:", e);
    return null;
  }
}
