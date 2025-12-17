import { RecognitionRule } from '../types';
import OSS from 'ali-oss'; // 👈 必须引入这个

// ============================================================
// 1. Bmob 配置 (保持不变，用于存规则数据)
const BMOB_APP_ID = "3840e08f813e857d386c32148b5af56f";
const BMOB_REST_KEY = "c0e82c1541acfd409e0224565e625ebe";
const BMOB_URL = "https://api.codenow.cn/1/classes/rules";

// 2. 阿里云 OSS 配置 (用于存图片/视频)
// 🔴 请填入你刚才申请的 RAM 子账号 AccessKey
const OSS_CONFIG = {
  region: 'oss-cn-beijing', // 你的 Bucket 地域 (北京)
  accessKeyId: 'LTAI5tGejP9rVNLb6LRvuJLi',     // 👈 填这里！
  accessKeySecret: '5wn9FkPBUMPSO4lJ2vonqvWyvxLqN8', // 👈 填这里！
  bucket: 'wpf-lens-images', // 你的 Bucket 名字
  secure: true // 强制 HTTPS
};
// ============================================================

// 初始化 OSS
const client = new OSS(OSS_CONFIG);

const HEADERS = {
  "X-Bmob-Application-Id": BMOB_APP_ID,
  "X-Bmob-REST-API-Key": BMOB_REST_KEY,
  "Content-Type": "application/json"
};

// 1. 获取规则 (从 Bmob)
export async function getRules(): Promise<RecognitionRule[]> {
  try {
    const response = await fetch(`${BMOB_URL}?order=-createdAt`, {
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
        // 强制 HTTPS
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

// 2. 保存规则 (到 Bmob)
export async function saveRule(rule: RecognitionRule) {
  const payload = {
    name: rule.name,
    targetType: rule.targetType,
    targetValue: rule.targetValue,
    feedback: rule.feedback
  };

  try {
    const response = await fetch(BMOB_URL, {
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

export async function deleteRule(id: string) {
  try { await fetch(`${BMOB_URL}/${id}`, { method: "DELETE", headers: HEADERS }); } catch (e) {}
}

// 3. 上传文件 (🚀 改用阿里云 OSS，彻底解决 10007 错误)
export async function uploadFile(file: File): Promise<string> {
  try {
    // 随机文件名
    const extension = file.name.split('.').pop() || 'tmp';
    const fileName = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;

    console.log("🚀 开始上传到阿里云 OSS...");
    
    // 直传阿里云
    const result = await client.put(fileName, file);
    
    // 返回 HTTPS 链接
    if (result && result.url) {
      return result.url.replace("http://", "https://");
    } else {
      throw new Error("OSS 上传未返回链接");
    }
  } catch (e: any) {
    console.error("OSS 上传失败:", e);
    alert(`文件上传失败: ${e.message || "请检查 OSS 配置"}`);
    throw e;
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
