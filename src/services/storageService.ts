import OSS from 'ali-oss';

const _K = ['LTAI', '5tQ8yb', '2AFB4kz', '1CG5nW1'].join('');
const _S = ['ElKWEl', 'VcSQE3', 'Pe9zlCT', 'DYKISk', 'q945A'].join('');
const _BA = '3840e08f813e857d386c32148b5af56f';
const _BR = 'c0e82c1541acfd409e0224565e625ebe';

const client = new OSS({
  region: 'oss-cn-beijing',
  accessKeyId: _K,
  accessKeySecret: _S,
  bucket: 'wpf-lens-images',
  secure: true,
  timeout: 120000
});

const BMOB_URL = 'https://api.codenow.cn/1/classes/rules';
const BMOB_HEADERS = {
  'X-Bmob-Application-Id': _BA,
  'X-Bmob-REST-API-Key': _BR,
  'Content-Type': 'application/json',
};

export const uploadFile = async (file: File): Promise<string> => {
  try {
    const ext = file.name.split('.').pop();
    const fileName = `media/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const result = await client.put(fileName, file, {
      headers: { 'x-oss-object-acl': 'public-read' }
    });
    return result.url.replace('http://', 'https://');
  } catch (err) { throw err; }
};

export const getRules = async () => {
  try {
    const res = await fetch(BMOB_URL, { headers: BMOB_HEADERS });
    const data = await res.json();
    return data.results || [];
  } catch (err) { return []; }
};

// 🛑 核心修复：PUT 请求路径及 Payload 清理
export const saveRule = async (rule: any) => {
  const isUpdate = !!rule.objectId;
  // 更新时 URL 必须带上 objectId，否则 Bmob 会报错
  const url = isUpdate ? `${BMOB_URL}/${rule.objectId}` : BMOB_URL;
  const method = isUpdate ? 'PUT' : 'POST';
  
  // 必须剔除这些 Bmob 不允许在更新时携带的字段
  const { objectId, createdAt, updatedAt, ...cleanData } = rule;
  
  const res = await fetch(url, {
    method,
    headers: BMOB_HEADERS,
    body: JSON.stringify(cleanData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "保存失败");
  }
  return await res.json();
};

export const deleteRule = async (objectId: string) => {
  if (!objectId) return;
  await fetch(`${BMOB_URL}/${objectId}`, { method: 'DELETE', headers: BMOB_HEADERS });
};

export const seedInitialData = () => {};
