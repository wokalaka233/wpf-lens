export type TargetType = 'ocr' | 'image' | 'similarity';
export type FeedbackType = 'text' | 'image' | 'video' | 'audio';

export interface FeedbackConfig {
  type: FeedbackType;
  content: string; // 文本内容 或 媒体资源的ID/URL
}

export interface RecognitionRule {
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

// ✅ 这就是刚才缺少的“日志”定义，补上它就不报错了
export interface RecognitionLog {
  id: string;
  timestamp: number;
  matchedRuleId: string | null;
  success: boolean;
}
