import { RecognitionRule } from './types';

// ============================================================
// 📢 全局规则库
// 在这里修改规则并上传 GitHub，所有用户打开网站都会看到这些规则
// ============================================================

export const GLOBAL_RULES: RecognitionRule[] = [
  {
    id: 'rule_person',
    name: '人类检测',
    targetType: 'image', // 识物模式
    targetValue: 'person', // 英文关键字
    feedback: [{ type: 'text', content: '你好！欢迎来到 wpf 的镜头！' }],
    createdAt: 1715000000000
  },
  {
    id: 'rule_cup',
    name: '水杯',
    targetType: 'image',
    targetValue: 'cup', 
    feedback: [{ type: 'text', content: '这是一个杯子，记得多喝水哦。' }],
    createdAt: 1715000000001
  },
  {
    id: 'rule_keyboard',
    name: '键盘',
    targetType: 'image',
    targetValue: 'keyboard',
    feedback: [{ type: 'text', content: '检测到键盘，是在写代码吗？加油！' }],
    createdAt: 1715000000002
  }
];
