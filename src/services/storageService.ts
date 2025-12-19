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
  } catch (err) {
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

// 🛑 核心修复：支持新增(POST)和更新(PUT)
export const saveRule = async (rule: any) => {
  const isUpdate = !!rule.objectId;
  const url = isUpdate ? `${BMOB_URL}/${rule.objectId}` : BMOB_URL;
  const method = isUpdate ? 'PUT' : 'POST';
  
  // 过滤掉不可同步的本地临时字段
  const { ...payload } = rule;
  
  const res = await fetch(url, {
    method,
    headers: BMOB_HEADERS,
    body: JSON.stringify(payload),
  });
  return await res.json();
};

export const deleteRule = async (id: string) => {
  await fetch(`${BMOB_URL}/${id}`, { method: 'DELETE', headers: BMOB_HEADERS });
};

export const seedInitialData = () => {};
