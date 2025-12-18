import OSS from 'ali-oss';

// --- 钥匙混淆 (保持保密) ---
const _OSS_I = ['LTAI', '5tQ8yb', '2AFB4kz', '1CG5nW1'].join('');
const _OSS_S = ['ElKWEl', 'VcSQE3', 'Pe9zlCT', 'DYKISk', 'q945A'].join('');
const _BMOB_A = '3840e08f813e857d386c32148b5af56f';
const _BMOB_R = 'c0e82c1541acfd409e0224565e625ebe';

const client = new OSS({
  region: 'oss-cn-beijing',
  accessKeyId: _OSS_I,
  accessKeySecret: _OSS_S,
  bucket: 'wpf-lens-images',
  secure: true, 
});

/**
 * 1. 通用上传函数 (图片/视频/音频均可)
 * @param file 手机端通过 <input> 获取的文件
 */
export const uploadMedia = async (file: File): Promise<string> => {
  try {
    // 根据文件类型归类文件夹
    const typeFolder = file.type.split('/')[0]; // 'image' | 'video' | 'audio'
    const fileName = `media/${typeFolder}/${Date.now()}_${file.name}`;

    console.log(`[移动端] 正在上传 ${typeFolder}: ${file.name}`);
    
    const result = await client.put(fileName, file, {
      mime: file.type,
      headers: { 'x-oss-object-acl': 'public-read' }
    });

    return result.url.replace('http://', 'https://');
  } catch (error) {
    console.error('上传失败，请检查网络或CORS设置:', error);
    throw error;
  }
};

/**
 * 2. 更新 Bmob 规则 (往 feedback 数组里追加内容)
 * @param objectId Bmob 表里那行数据的唯一 ID
 * @param newFeedback 新的反馈对象 {content: "url", type: "image/video/text"}
 */
export const updateBmobRule = async (objectId: string, newFeedback: {content: string, type: string}) => {
  const url = `https://api.codenow.cn/1/classes/rules/${objectId}`;

  // Bmob 的特殊语法：__op: "Add" 表示向数组追加元素
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Bmob-Application-Id': _BMOB_A,
      'X-Bmob-REST-API-Key': _BMOB_R,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      feedback: {
        "__op": "Add",
        "objects": [newFeedback]
      }
    }),
  });

  return await response.json();
};
