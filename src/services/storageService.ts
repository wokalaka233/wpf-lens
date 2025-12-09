import Bmob from "hydrogen-js-sdk";
import { RecognitionRule } from '../types';

// ============================================================
// 🔴 必填：请填入你在 Bmob 后台看到的 Secret Key 和 API 安全码
const SECRET_KEY = "dbe4b8134d2a1071";
const SECURITY_CODE = "8bc6adffbb5746b030b46c7dd2afccac"; // 如果后台没显示，就留空字符串 ""
// ============================================================

// 初始化 Bmob
Bmob.initialize(SECRET_KEY, SECURITY_CODE);

// 1. 获取云端规则
export async function getRules(): Promise<RecognitionRule[]> {
  try {
    // ⚡️ 修复点1：加 as any，防止 TS1062 报错
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
    return [];
  }
}

// 2. 保存规则 (新增)
export async function saveRule(rule: RecognitionRule) {
  // ⚡️ 修复点2：加 as any
  const query = Bmob.Query("rules") as any;
  
  query.set("name", rule.name);
  query.set("targetType", rule.targetType);
  query.set("targetValue", rule.targetValue);
  
  // ⚡️ 修复点3：加 as any，强行把数组存进去，防止 TS2345 报错
  query.set("feedback", rule.feedback as any);
  
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
  // ⚡️ 修复点4：加 as any
  const query = Bmob.Query("rules") as any;
  try {
    await query.destroy(id);
  } catch (e) {
    console.error("删除失败:", e);
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
