import { RecognitionRule } from '../types';

// ============================================================
// ✅ 你的 Bmob 凭证 (保持不变)
const APP_ID = "3840e08f813e857d386c32148b5af56f";
const REST_KEY = "c0e82c1541acfd409e0224565e625ebe";
// ============================================================

const BASE_URL = "https://api.codenow.cn/1/classes/rules";
const FILE_URL = "https://api.codenow.cn/2/files"; // 文件上传接口

const HEADERS = {
  "X-Bmob-Application-Id": APP_ID,
  "X-Bmob-REST-API-Key": REST_KEY,
  "Content-Type": "application/json"
};

// 1. 获取云端规则
export async function getRules(): Promise<RecognitionRule[]> {
  try {
    const response = await fetch(`${BASE_URL}?order=-createdAt`, {
      method: "GET",
      headers: HEADERS
    });
    if (!response.ok) return [];
    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((item: any) => ({
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
    console.error("获取规则失败:", e);
    return [];
  }
}

// 2. 保存规则
export async function saveRule(rule: RecognitionRule) {
  const payload = {
    name: rule.name,
    targetType: rule.targetType,
    targetValue: rule.targetValue,
    feedback: rule.feedback
  };

  try {
    // 简化逻辑：这里我们只处理新增，不处理复杂的修改，确保 ID 一致性
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    console.log("✅ 规则已同步");
  } catch (e: any) {
    console.error(e);
    alert(`保存规则失败: ${e.message || "网络错误"}`);
    throw e; // 抛出错误让前端停止 loading
  }
}

// 3. 删除规则
export async function deleteRule(id: string) {
  try {
    await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: HEADERS
    });
  } catch (e) {
    console.error("删除失败:", e);
  }
}

// 🚀 新增：上传文件到 Bmob 云存储
export async function uploadFile(file: File): Promise<string> {
  const fileName = encodeURIComponent(file.name);
  
  try {
    // Bmob 文件上传 API
    const response = await fetch(`${FILE_URL}/${fileName}`, {
      method: "POST",
      headers: {
        "X-Bmob-Application-Id": APP_ID,
        "X-Bmob-REST-API-Key": REST_KEY,
        "Content-Type": file.type // 自动识别文件类型
      },
      body: file // 直接发送文件二进制数据
    });

    const data = await response.json();
    
    if (data.url) {
      // 这里的 url 是 http，为了兼容性最好转成 https
      return data.url.replace("http://", "https://");
    } else {
      throw new Error("上传失败，未返回 URL");
    }
  } catch (e: any) {
    console.error("文件上传出错:", e);
    alert("文件上传失败，请检查文件大小（建议小于 10MB）");
    throw e;
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
