import { RecognitionRule } from '../types';

// ============================================================
// ✅ 你的 Bmob 凭证 (已从你之前的截图提取，无需修改)
// 这种方式不需要 "安全码"，完全绕过 safeToken 报错
const APP_ID = "3840e08f813e857d386c32148b5af56f";
const REST_KEY = "c0e82c1541acfd409e0224565e625ebe";
// ============================================================

// Bmob API 基础地址
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
    // 按创建时间倒序
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
        // 修复 http 链接为 https
        feedback: (item.feedback || []).map((fb: any) => ({
          ...fb,
          content: fb.content && fb.content.startsWith('http:') ? fb.content.replace('http:', 'https:') : fb.content
        })), 
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
  const payload = {
    name: rule.name,
    targetType: rule.targetType,
    targetValue: rule.targetValue,
    // 保存前确保 https
    feedback: rule.feedback.map(fb => ({
      ...fb,
      content: fb.content && fb.content.startsWith('http:') ? fb.content.replace('http:', 'https:') : fb.content
    }))
  };

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }
    
    console.log("✅ 规则已同步");
  } catch (e: any) {
    console.error(e);
    alert(`保存失败: ${e.message || "未知错误"}`);
    throw e;
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

// 4. 上传文件 (解决大文件和权限问题)
export async function uploadFile(file: File): Promise<string> {
  // 限制文件名，防止中文乱码
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
      // 强制转 https，防止摄像头权限丢失
      return data.url.replace("http://", "https://");
    } else {
      throw new Error("上传未返回链接");
    }
  } catch (e: any) {
    console.error("上传出错:", e);
    alert("文件上传失败，请重试");
    throw e;
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
