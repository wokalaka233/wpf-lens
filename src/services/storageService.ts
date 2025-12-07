import { RecognitionRule, RecognitionLog } from '../types';

const KEYS = {
  RULES: 'smartlens_rules',
  LOGS: 'smartlens_logs',
};

export const getRules = (): RecognitionRule[] => {
  const data = localStorage.getItem(KEYS.RULES);
  return data ? JSON.parse(data) : [];
};

export const saveRule = (rule: RecognitionRule) => {
  const rules = getRules();
  const existingIndex = rules.findIndex((r) => r.id === rule.id);
  if (existingIndex >= 0) {
    rules[existingIndex] = rule;
  } else {
    rules.push(rule);
  }
  localStorage.setItem(KEYS.RULES, JSON.stringify(rules));
};

export const deleteRule = (id: string) => {
  const rules = getRules().filter((r) => r.id !== id);
  localStorage.setItem(KEYS.RULES, JSON.stringify(rules));
};

export const saveLog = (log: RecognitionLog) => {
  const logs = getLogs();
  logs.unshift(log); 
  if (logs.length > 50) logs.pop();
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
};

export const getLogs = (): RecognitionLog[] => {
  const data = localStorage.getItem(KEYS.LOGS);
  return data ? JSON.parse(data) : [];
};

export const seedInitialData = () => {
  if (getRules().length === 0) {
    const demoRules: RecognitionRule[] = [
      {
        id: '1',
        name: '尋找 "SALE"',
        targetType: 'ocr',
        targetValue: 'SALE',
        similarityThreshold: 0.8,
        createdAt: Date.now(),
        feedback: [{ type: 'text', content: '發現特價商品！' }]
      },
      {
        id: '2',
        name: '咖啡杯識別',
        targetType: 'image',
        targetValue: 'cup',
        similarityThreshold: 0.8,
        createdAt: Date.now(),
        feedback: [{ type: 'text', content: '這是一杯美味的咖啡！' }]
      }
    ];
    localStorage.setItem(KEYS.RULES, JSON.stringify(demoRules));
  }
};