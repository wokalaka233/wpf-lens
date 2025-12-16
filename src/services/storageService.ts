import Bmob from "hydrogen-js-sdk";
import { RecognitionRule } from '../types';

// ============================================================
// 🔴 请确认你的 Secret Key (从后台复制)
const SECRET_KEY = "dbe4b8134d2a1071"; 
// 🔴 请确认你的 API 安全码 (后台没开就是空字符串)
const SECURITY_CODE = ""; 
// ============================================================

// ⚡️ 关键修复：Bmob 初始化
// 如果没有安全码，这就足够了
Bmob.initialize(SECRET_KEY, SECURITY_CODE);

// 1. 获取云端规则
export async function getRules(): Promise<RecognitionRule[]> {
  try {
    const query = Bmob.Query("rules") as any;
    query.order("-createdAt"); 
    const res = await query.find();
    
    if (Array.isArray(res)) {
      return res.map((item: any) => ({
        id: item.objectId, 
        name: item.name,
        targetType: item.targetType,
        targetValue: item.targetValue,
        feedback: item.feedback, 
        createdAt: new Date(item.createdAt).getTime()
      }));
    }
    return [];
  } catch (e) {
    console.error("Bmob 获取失败:", e);
    // 失败时不弹窗干扰用户，只返回空数组
    return [];
  }
}

// 2. 保存规则 (新增)
export async function saveRule(rule: RecognitionRule) {
  const query = Bmob.Query("rules") as any;
  
  // 设置字段
  query.set("name", rule.name);
  query.set("targetType", rule.targetType);
  query.set("targetValue", rule.targetValue);
  
  // 强制转换数组，防止类型报错
  query.set("feedback", rule.feedback as any);
  
  try {
    await query.save();
    console.log("✅ 规则已同步到云端");
  } catch (e: any) {
    console.error(e);
    // 更加详细的错误提示
    if (e.code === 401) {
      alert("保存失败：Key 错误或未授权。请检查 Bmob 后台是否开启了 API 安全码？");
    } else {
      alert(`保存失败: ${e.error || "未知错误"}`);
    }
  }
}

// 3. 删除规则
export async function deleteRule(id: string) {
  const query = Bmob.Query("rules") as any;
  try {
    await query.destroy(id);
  } catch (e) {
    console.error("删除失败:", e);
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
