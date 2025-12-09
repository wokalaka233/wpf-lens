import Bmob from "hydrogen-js-sdk";
import { RecognitionRule } from '../types';

// ============================================================
// 🔴 必填：去 Bmob 后台复制你的 Secret Key 和 API 安全码
const SECRET_KEY = "在这里填你的Secret Key";
const SECURITY_CODE = "在这里填API安全码"; // 如果后台没显示，就留空字符串 ""
// ============================================================

// 初始化 Bmob
Bmob.initialize(SECRET_KEY, SECURITY_CODE);

// 1. 获取云端规则
export async function getRules(): Promise<RecognitionRule[]> {
  try {
    const query = Bmob.Query("rules");
    query.order("-createdAt"); // 最新创建的在前面
    const res = await query.find();
    
    if (Array.isArray(res)) {
      // Bmob 的数据结构转换
      return res.map((item: any) => ({
        id: item.objectId, // Bmob 自动生成的唯一 ID
        name: item.name,
        targetType: item.targetType,
        targetValue: item.targetValue,
        feedback: item.feedback, 
        createdAt: new Date(item.createdAt).getTime()
      }));
    }
    return [];
  } catch (e) {
    console.error("获取规则失败:", e);
    return [];
  }
}

// 2. 保存规则 (新增)
export async function saveRule(rule: RecognitionRule) {
  const query = Bmob.Query("rules");
  
  // 设置字段
  query.set("name", rule.name);
  query.set("targetType", rule.targetType);
  query.set("targetValue", rule.targetValue);
  query.set("feedback", rule.feedback);
  
  // Bmob 会自动处理新增
  try {
    await query.save();
    console.log("✅ 规则已同步到云端");
  } catch (e) {
    alert("保存失败，请检查 Bmob Key 是否正确");
    console.error(e);
  }
}

// 3. 删除规则
export async function deleteRule(id: string) {
  const query = Bmob.Query("rules");
  try {
    await query.destroy(id);
  } catch (e) {
    console.error("删除失败:", e);
  }
}

export function seedInitialData() {}
export function saveLog() {}
