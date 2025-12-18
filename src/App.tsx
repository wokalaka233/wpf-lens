import React, { useState, useEffect } from 'react';
import { Camera, Plus, Trash2, Image as ImageIcon, Video, Mic, Loader2, Play, CheckCircle2 } from 'lucide-react';
import * as storage from './services/storageService';

function App() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // 1. 初始化加载数据
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const data = await storage.getRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("加载失败:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. 处理文件上传并更新规则 (手机端弹出)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, objectId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await storage.uploadFile(file);
      // 获取文件类型：image, video, audio
      const fileType = file.type.split('/')[0] || 'text';
      
      // 更新 Bmob 中的 feedback 数组
      await storage.updateRule(objectId, {
        feedback: {
          "__op": "Add",
          "objects": [{ content: url, type: fileType }]
        }
      });
      
      alert("上传并同步成功！");
      refreshData();
    } catch (err) {
      alert("操作失败，请检查网络或CORS配置");
    } finally {
      setUploading(false);
    }
  };

  // 3. 辅助函数：渲染媒体内容 (核心修复：防御 startWith 崩溃)
  const renderMedia = (url: string, type: string = 'image') => {
    const safeUrl = url || ''; // 确保 url 不是 undefined
    if (!safeUrl.startsWith?.('http')) return <span className="text-gray-400">无媒体内容</span>;

    if (type === 'video' || safeUrl.toLowerCase().endsWith('.mp4')) {
      return <video src={safeUrl} controls className="w-full h-40 rounded-lg bg-black" />;
    }
    if (type === 'audio' || safeUrl.toLowerCase().endsWith('.mp3')) {
      return <audio src={safeUrl} controls className="w-full mt-2" />;
    }
    return <img src={safeUrl} alt="media" className="w-full h-40 object-cover rounded-lg shadow-sm" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="mt-4 text-gray-500">正在同步云端规则...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* 头部 */}
      <header className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Camera className="w-6 h-6" /> wpf-lens 后台管理
        </h1>
      </header>

      {/* 主体列表 */}
      <main className="p-4 max-w-md mx-auto space-y-4">
        {rules.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            暂无规则，请在 Bmob 后台添加
          </div>
        )}

        {rules.map((rule) => (
          <div key={rule.objectId} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{rule.name || '未命名规则'}</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                  ID: {rule.objectId}
                </span>
              </div>
              <button 
                onClick={async () => { if(confirm('确定删除?')) { await storage.deleteRule(rule.objectId); refreshData(); } }}
                className="text-red-400 p-1"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* 目标展示 */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">识别目标 (targetValue):</p>
              {renderMedia(rule.targetValue, rule.targetType)}
            </div>

            {/* 反馈展示 */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500 font-medium border-t pt-2">已有关联反馈 (feedback):</p>
              {rule.feedback?.map((fb: any, index: number) => (
                <div key={index} className="bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200">
                  {fb.type === 'text' ? <p className="p-2 italic text-gray-600">"{fb.content}"</p> : renderMedia(fb.content, fb.type)}
                </div>
              ))}
            </div>

            {/* 手机端操作按钮组 */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
              <label className="flex flex-col items-center justify-center p-2 bg-blue-50 text-blue-600 rounded-lg active:scale-95 transition">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[10px] mt-1">加照片</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, rule.objectId)} />
              </label>
              
              <label className="flex flex-col items-center justify-center p-2 bg-green-50 text-green-600 rounded-lg active:scale-95 transition">
                <Video className="w-6 h-6" />
                <span className="text-[10px] mt-1">加视频</span>
                <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, rule.objectId)} />
              </label>

              <label className="flex flex-col items-center justify-center p-2 bg-purple-50 text-purple-600 rounded-lg active:scale-95 transition">
                <Mic className="w-6 h-6" />
                <span className="text-[10px] mt-1">加录音</span>
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, rule.objectId)} />
              </label>
            </div>
          </div>
        ))}
      </main>

      {/* 底部识别按钮 (用于演示全流程) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <button 
          onClick={() => alert('跳转到AI识别界面...')}
          className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-full shadow-2xl active:scale-90 transition-all font-bold"
        >
          <Camera className="w-6 h-6" /> 开始 AI 识别
        </button>
      </div>

      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="font-medium">媒体上传中...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
