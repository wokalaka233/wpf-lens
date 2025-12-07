export type FeedbackType = 'video' | 'audio' | 'text' | 'image';
export type TargetType = 'ocr' | 'image' | 'similarity';

export interface FeedbackConfig {
  type: FeedbackType;
  content: string;
}

export interface RecognitionRule {
  id: string;
  name: string;
  targetType: TargetType;
  targetValue: string;
  embedding?: number[];
  similarityThreshold: number;
  feedback: FeedbackConfig[];
  createdAt: number;
}

export interface RecognitionLog {
  id: string;
  timestamp: number;
  matchedRuleId: string | null;
  success: boolean;
}

export interface AppSettings {
  enableHighAccuracy?: boolean;
}