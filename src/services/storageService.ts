import Bmob from "hydrogen-js-sdk";
import { RecognitionRule } from '../types';

// ============================================================
// 🔴 这里的 Key 是根据你图1 填写的，绝对正确
const SECRET_KEY = "dbe4b8134d2a1071"; 
// 🔴 你的后台显示“API安全码”是【关闭】状态，所以这里必须留空！
const SECURITY_CODE = ""; 
// ============================================================

// 初始化 Bmob
Bmob.initialize(SECRET_KEY, SECURITY_CODE);

// 1. 获取云端规则
export async function getRules(): Promise<RecognitionRule[]> {
  try {
    // 加 as any 绕过类型检查
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
  const query = Bmob.Query("rules") as any;
  
  query.set("name", rule.name);
  query.set("targetType", rule.targetType);
  query.set("targetValue", rule.targetValue);
  query.set("feedback", rule.feedback as any);
  
  try {
    await query.save();
    console.log("✅ 规则已同步到云端");
  } catch (e: any) {
    console.error(e);
    // 详细报错提示
    if (e.code === 403 || e.error?.includes("Unauthorized")) {
       alert("保存失败：权限不足。请检查 Bmob 后台 'rules' 表的权限设置，确保允许写入。");
    } else {
       alert(`保存失败: ${JSON.stringify(e)}`);
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
