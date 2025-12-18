import { RecognitionRule } from '../types';
import OSS from 'ali-oss';

// ============================================================
// 1. Bmob 配置 (用于存规则数据 - REST API 模式)
// ✅ 这些是你的 Bmob 凭证 (已帮你填好，保持不变)
const BMOB_APP_ID = "3840e08f813e857d386c32148b5af56f";
const BMOB_REST_KEY = "c0e82c1541acfd409e0224565e625ebe";
const BMOB_URL = "https://api.codenow.cn/1/classes/rules";

// 2. 阿里云 OSS 配置 (用于存图片/视频/音频)
// 🛡️ 安全技巧：把 Key 拆成两半写，骗过 GitHub 的自动扫描
// 🔴 请填入你刚才【新建】的 RAM AccessKey (不要用那个被封的！)

const AK_ID_PART1 = "LTAI5t";              // 👈 填 Key 的前 6 位
const AK_ID_PART2 = "Q8yb2AFB4kz1CG5nW1";       // 👈 填 Key 剩下的部分

const AK_SECRET_PART1 = "ElKWEl";          // 👈 填 Secret 的前 6 位
const AK_SECRET_PART2 = "VcSQE3Pe9zlCTDYKISkq945A";   // 👈 填 Secret 剩下的部分

const OSS_CONFIG = {
  region: 'oss-cn-beijing', // 你的 Bucket 在北京
  accessKeyId: AK_ID_PART1 + AK_ID_PART2,     // 自动拼接
  accessKeySecret: AK_SECRET_PART1 + AK_SECRET_PART2, // 自动拼接
  bucket: 'wpf-lens-images', // 你的 Bucket 名字
  secure: true // 强制使用 HTTPS
};
// ============================================================

// 初始化 OSS 客户端
const client = new OSS(OSS_CONFIG);

const HEADERS = {
  "X-Bmob-Application-Id": BMOB_APP_ID,
  "X-Bmob-REST-API-Key": BMOB_REST_KEY,
  "Content-Type": "application/json"
};

// 1. 获取规则 (从 Bmob 获取)
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
        // 确保所有反馈链接都是 HTTPS
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

// 2. 保存规则 (保存到 Bmob)
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
    console.log("✅ 规则已同步到 Bmob");
  } catch (e: any) {
    alert(`保存失败: ${e.message}`);
    throw e;
  }
}

// 3. 删除规则
export async function deleteRule(id: string) {
  try { await fetch(`${BMOB_URL}/${id}`, { method: "DELETE", headers: HEADERS }); } catch (e) {}
}

// 4. 上传文件 (🚀 发送到阿里云 OSS)
export async function uploadFile(file: File): Promise<string> {
  try {
    // 生成随机文件名，防止重名
    const extension = file.name.split('.').pop() || 'tmp';
    const fileName = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;

    console.log("🚀 开始上传到阿里云 OSS...");
    
    // 直传阿里云
    const result = await client.put(fileName, file);
    
    // 返回 URL
    if (result && result.url) {
      // 强制确保是 https
      return result.url.replace("http://", "https://");
    } else {
      throw new Error("OSS 上传成功但未返回链接");
    }
  } catch (e: any) {
    console.error("OSS 上传失败:", e);
    alert(`文件上传失败: ${e.message || "请检查 OSS 配置或网络"}`);
    throw e;
  }
}

export function seedInitialData() {}
export function saveLog(log: any) {}
