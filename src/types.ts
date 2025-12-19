export type TargetType = 'ocr' | 'image' | 'similarity';
export type FeedbackType = 'text' | 'image' | 'video' | 'audio';

export interface FeedbackConfig {
  type: FeedbackType;
  content: string; // 文本内容 或 媒体资源的ID/URL
}

export interface RecognitionRule {
  // 🛑 核心修复：增加 objectId 以兼容 Bmob 数据库返回的 ID
  objectId?: string; 
  
  id: string;
  name: string;
  targetType: TargetType;
  targetValue: string; // OCR关键字 或 物体名称
  
  // 这里的问号 ? 必须保留
  embedding?: number[]; 
  similarityThreshold?: number; 
  
  feedback: FeedbackConfig[];
  createdAt: number;
}

// ✅ 保留你的日志定义
export interface RecognitionLog {
  id: string;
  timestamp: number;
  matchedRuleId: string | null;
  success: boolean;
}
