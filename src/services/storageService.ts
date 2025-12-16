import { RecognitionRule } from '../types';

// ============================================================
// ✅ 这里填的是你的 Application ID 和 REST API Key (已从你截图提取)
// 这种连接方式不需要 "安全码"，绝对稳！
const APP_ID = "3840e08f813e857d386c32148b5af56f";
const REST_KEY = "c0e82c1541acfd409e0224565e625ebe";
// ============================================================

// Bmob 的 API 地址 (根据你之前的截图，你的节点是 api.codenow.cn)
const BASE_URL = "https://api.codenow.cn/1/classes/rules";

const HEADERS = {
  "X-Bmob-Application-Id": APP_ID,
  "X-Bmob-REST-API-Key": REST_KEY,
  "Content-Type": "application/json"
};

// 1. 获取云端规则
export async function getRules(): Promise<RecognitionRule[]> {
  try {
    // 按创建时间倒序排列 (-createdAt)
    const response = await fetch(`${BASE_URL}?order=-createdAt`, {
      method: "GET",
      headers: HEADERS
    });
    
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();
    
    // Bmob REST API 返回的数据在 results 字段里
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

// 2. 保存规则 (新增)
export async function saveRule(rule: RecognitionRule) {
  // 构造要发送的数据 (不需要发 objectId，服务器会生成)
  const payload = {
    name: rule.name,
    targetType: rule.targetType,
    targetValue: rule.targetValue,
    feedback: rule.feedback
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
    
    console.log("✅ 规则已通过 REST API 同步");
  } catch (e: any) {
    console.error(e);
    alert(`保存失败: ${e.message || "未知错误"}`);
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

// 占位函数
export function seedInitialData() {}
export function saveLog(log: any) {}
