import { RecognitionRule } from '../types';

// ============================================================
// Bmob 凭证 (已确认可用)
const APP_ID = "3840e08f813e857d386c32148b5af56f";
const REST_KEY = "c0e82c1541acfd409e0224565e625ebe";
// ============================================================

const BASE_URL = "https://api.codenow.cn/1/classes/rules";
const FILE_URL = "https://api.codenow.cn/2/files";

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
        // 🛡️ 强力清洗：确保所有链接都是 HTTPS
        feedback: (item.feedback || []).map((fb: any) => ({
          ...fb,
          content: fb.content && fb.content.startsWith('http') ? fb.content.replace(/^http:\/\//i, 'https://') : fb.content
        })), 
        createdAt: new Date(item.createdAt).getTime()
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
}

// 2. 保存规则
export async function saveRule(rule: RecognitionRule) {
  const payload = {
    name: rule.name,
    targetType: rule.targetType,
    targetValue: rule.targetValue,
    // 🛡️ 保存时也清洗一遍
    feedback: rule.feedback.map(fb => ({
      ...fb,
      content: fb.content && fb.content.startsWith('http') ? fb.content.replace(/^http:\/\//i, 'https://') : fb.content
    }))
  };

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    console.log("✅ 规则已同步");
  } catch (e: any) {
    alert(`保存失败: ${e.message || "网络错误"}`);
    throw e;
  }
}

// 3. 删除规则
export async function deleteRule(id: string) {
  try { await fetch(`${BASE_URL}/${id}`, { method: "DELETE", headers: HEADERS }); } catch (e) {}
}

// 4. 上传文件 (最关键的一步)
export async function uploadFile(file: File): Promise<string> {
  const fileName = encodeURIComponent(file.name);
  
  try {
    const response = await fetch(`${FILE_URL}/${fileName}`, {
      method: "POST",
      headers: {
        "X-Bmob-Application-Id": APP_ID,
        "X-Bmob-REST-API-Key": REST_KEY,
        "Content-Type": file.type
      },
      body: file
    });

    const data = await response.json();
    
    if (data.url) {
      let finalUrl = data.url;
      // 🛡️ 强制 HTTPS 转换
      if (finalUrl.startsWith('http://')) {
        finalUrl = finalUrl.replace('http://', 'https://');
      }
      return finalUrl;
    } else {
      throw new Error("上传失败");
    }
  } catch (e: any) {
    alert("文件上传失败，请重试");
    throw e;
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
