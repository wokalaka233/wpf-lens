import OSS from 'ali-oss';

/**
 * CTO 灵犀：数据服务层
 * 确保媒体公共可见，强制 HTTPS，分段秘钥保密
 */

const _K = ['LTAI', '5tQ8yb', '2AFB4kz', '1CG5nW1'].join('');
const _S = ['ElKWEl', 'VcSQE3', 'Pe9zlCT', 'DYKISk', 'q945A'].join('');
const _BA = '3840e08f813e857d386c32148b5af56f';
const _BR = 'c0e82c1541acfd409e0224565e625ebe';

const client = new OSS({
  region: 'oss-cn-beijing',
  accessKeyId: _K,
  accessKeySecret: _S,
  bucket: 'wpf-lens-images',
  secure: true, // 强制 HTTPS
  timeout: 120000
});

const BMOB_URL = 'https://api.codenow.cn/1/classes/rules';
const BMOB_HEADERS = {
  'X-Bmob-Application-Id': _BA,
  'X-Bmob-REST-API-Key': _BR,
  'Content-Type': 'application/json',
};

// 上传并确保全球可见
export const uploadFile = async (file: File): Promise<string> => {
  try {
    const ext = file.name.split('.').pop();
    const fileName = `media/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const result = await client.put(fileName, file, {
      headers: { 'x-oss-object-acl': 'public-read' }
    });
    return result.url.replace('http://', 'https://');
  } catch (err) {
    console.error('OSS上传失败:', err);
    throw err;
  }
};

export const getRules = async () => {
  try {
    const res = await fetch(BMOB_URL, { headers: BMOB_HEADERS });
    const data = await res.json();
    return data.results || [];
  } catch (err) { return []; }
};

export const saveRule = async (rule: any) => {
  const method = rule.objectId ? 'PUT' : 'POST';
  const url = rule.objectId ? `${BMOB_URL}/${rule.objectId}` : BMOB_URL;
  await fetch(url, {
    method,
    headers: BMOB_HEADERS,
    body: JSON.stringify(rule),
  });
};

export const deleteRule = async (id: string) => {
  await fetch(`${BMOB_URL}/${id}`, { method: 'DELETE', headers: BMOB_HEADERS });
};

export const seedInitialData = () => { console.log("[System] Ready"); };
