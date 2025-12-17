import { RecognitionRule } from '../types';

// ============================================================
// 你的 Bmob 凭证
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
        // ⚡️ 读取时：强制 http -> https
        feedback: (item.feedback || []).map((fb: any) => ({
          ...fb,
          content: fb.content && fb.content.startsWith('http:') ? fb.content.replace('http:', 'https:') : fb.content
        })), 
        createdAt: new Date(item.createdAt).getTime()
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
}

export async function saveRule(rule: RecognitionRule) {
  const payload = {
    name: rule.name,
    targetType: rule.targetType,
    targetValue: rule.targetValue,
    // ⚡️ 保存时：强制 http -> https
    feedback: rule.feedback.map(fb => ({
      ...fb,
      content: fb.content && fb.content.startsWith('http:') ? fb.content.replace('http:', 'https:') : fb.content
    }))
  };
  try {
    await fetch(BASE_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload)
    });
  } catch (e: any) {
    alert(`保存失败: ${e.message}`);
  }
}

export async function deleteRule(id: string) {
  try { await fetch(`${BASE_URL}/${id}`, { method: "DELETE", headers: HEADERS }); } catch (e) {}
}

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
      // ⚡️ 上传后：强制返回 https 链接
      return data.url.replace("http://", "https://");
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
