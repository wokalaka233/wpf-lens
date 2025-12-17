import { RecognitionRule } from '../types';

// ============================================================
// Bmob 凭证 (保持不变)
const APP_ID = "3840e08f813e857d386c32148b5af56f";
const REST_KEY = "c0e82c1541acfd409e0224565e625ebe";
// ============================================================

// ⚡️ 统一使用 codenow.cn 域名 (你的账号属于这个集群)
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
        feedback: (item.feedback || []).map((fb: any) => ({
          ...fb,
          // 强力修复 HTTPS
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

// 2. 保存规则
export async function saveRule(rule: RecognitionRule) {
  const payload = {
    name: rule.name,
    targetType: rule.targetType,
    targetValue: rule.targetValue,
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
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "保存失败");
    }
    console.log("✅ 规则已同步");
  } catch (e: any) {
    alert(`保存失败: ${e.message}`);
    throw e;
  }
}

// 3. 删除规则
export async function deleteRule(id: string) {
  try { await fetch(`${BASE_URL}/${id}`, { method: "DELETE", headers: HEADERS }); } catch (e) {}
}

// 4. 上传文件 (最终修复版)
export async function uploadFile(file: File): Promise<string> {
  // 🛡️ 必须保留：自动重命名 (防止中文名报错)
  const extension = file.name.split('.').pop() || 'jpg';
  const safeFileName = `file_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  
  try {
    const response = await fetch(`${FILE_URL}/${safeFileName}`, {
      method: "POST",
      headers: {
        "X-Bmob-Application-Id": APP_ID,
        "X-Bmob-REST-API-Key": REST_KEY,
        "Content-Type": file.type
      },
      body: file
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Status: ${response.status}, Error: ${errText}`);
    }

    const data = await response.json();
    
    // 🔍 调试输出：如果失败，我们可以看到返回了什么
    console.log("Upload response:", data);

    if (data.url) {
      return data.url.replace("http://", "https://");
    } else if (data.cdn) {
      // 有些节点返回的是 cdn 字段而不是 url
      return data.cdn.replace("http://", "https://");
    } else if (data.filename) {
      // 如果只有文件名，尝试手动拼接 (最后的保底)
      return `https://bmob-cdn-335540.bmobcloud.com/${data.filename}`;
    } else {
      // 抛出完整数据以便调试
      throw new Error(`上传成功但无链接，返回数据: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    console.error("上传出错:", e);
    alert(`文件上传失败: ${e.message}`);
    throw e;
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
