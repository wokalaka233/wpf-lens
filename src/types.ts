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
  
  // 🔴 注意下面这两个问号 ?，加上它就不会报错了
  embedding?: number[]; 
  similarityThreshold?: number; 
  
  feedback: FeedbackConfig[];
  createdAt: number;
}
