import Bmob from "hydrogen-js-sdk";
import { RecognitionRule } from '../types';

// ============================================================
// 🔴 必填：你的 Secret Key (保持你之前的，别动)
const SECRET_KEY = "dbe4b8134d2a1071"; 
const SECURITY_CODE = ""; 
// ============================================================

// 初始化
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
        // 🛡️ 关键修复：读取数据时，也把 http 替换成 https
        feedback: (item.feedback || []).map((fb: any) => ({
          ...fb,
          content: fb.content ? fb.content.replace(/^http:\/\//i, 'https://') : fb.content
        })), 
        createdAt: new Date(item.createdAt).getTime()
      }));
    }
    return [];
  } catch (e) {
    console.error("Bmob 获取失败:", e);
    return [];
  }
}

// 2. 保存规则
export async function saveRule(rule: RecognitionRule) {
  const query = Bmob.Query("rules") as any;
  
  query.set("name", rule.name);
  query.set("targetType", rule.targetType);
  query.set("targetValue", rule.targetValue);
  
  // 🛡️ 关键修复：保存前，确保所有链接都是 https
  const safeFeedback = rule.feedback.map(fb => ({
    ...fb,
    content: fb.content ? fb.content.replace(/^http:\/\//i, 'https://') : fb.content
  }));
  query.set("feedback", safeFeedback as any);
  
  try {
    await query.save();
    console.log("✅ 规则已同步到云端");
  } catch (e: any) {
    console.error(e);
    alert(`保存失败: ${JSON.stringify(e)}`);
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

// 4. 🛡️ 关键修改：文件上传强制 HTTPS
export async function uploadFile(file: File): Promise<string> {
  try {
    // Bmob SDK 文件上传
    const fileUpload = Bmob.File(file.name, file);
    const res = await (fileUpload as any).save();
    
    // res[0].url 就是 Bmob 返回的链接
    if (res && res.length > 0 && res[0].url) {
      let safeUrl = res[0].url;
      // 强行替换 http -> https
      if (safeUrl.startsWith('http://')) {
        safeUrl = safeUrl.replace('http://', 'https://');
      }
      return safeUrl;
    }
    throw new Error("未返回文件链接");
  } catch (e) {
    console.error("上传出错:", e);
    alert("上传失败，请重试");
    throw e;
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
