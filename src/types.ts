export type TargetType = 'ocr' | 'image' | 'similarity';
export type FeedbackType = 'text' | 'image' | 'video' | 'audio';

export interface FeedbackConfig {
  type: FeedbackType;
  content: string;
}

export interface RecognitionRule {
  objectId?: string; // Bmob 云端主键
  id: string;        // 本地/逻辑 ID
  name: string;
  targetType: TargetType;
  targetValue: string; // 文字描述
  referenceImage?: string; // 🛑 杀手锏：比对参考图 URL
  feedback: FeedbackConfig[];
  createdAt: number;
}
