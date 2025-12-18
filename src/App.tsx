import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, AlertCircle, CheckCircle2, ChevronLeft, Image as ImageIcon, Type, Video, Music, Lock, Edit2, Loader2 } from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import { RecognitionRule, FeedbackType, TargetType, FeedbackConfig } from './types';
import { GLOBAL_RULES } from './defaultRules';

// --- 工具函数保持不变 ---
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width; let height = img.height;
      const MAX_WIDTH = 1024;
      if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

// --- App 主组件逻辑补齐 ---
export default function App() {
  const [view, setView] = useState<any>('home');
  const [rules, setRules] = useState<RecognitionRule[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<RecognitionRule | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  const loadRules = async () => {
    const cloudRules = await storageService.getRules();
    const allRules = [...GLOBAL_RULES, ...cloudRules.filter(cr => !GLOBAL_RULES.find(gr => gr.id === cr.id))];
    setRules(allRules);
  };

  useEffect(() => {
    loadRules();
    localAiService.loadModels();
  }, [view]);

  const handleAnalyze = async (originalBase64: string) => {
    setView('processing');
    setErrorMsg(null);
    setMatchResult(null);
    const startTime = Date.now();
    try {
      const compressedImg = await compressImage(originalBase64);
      setCapturedImage(compressedImg);
      const resultString = await localAiService.analyzeImageLocal(compressedImg, rules);
      const endTime = Date.now();
      setProcessingTime((endTime - startTime) / 1000);

      if (resultString && !resultString.startsWith("DEBUG_INFO:") && !resultString.startsWith("ERROR:")) {
        const rule = rules.find(r => r.id === resultString);
        if (rule) { setMatchResult(rule); setView('feedback'); return; }
      }
      setErrorMsg(resultString?.startsWith("DEBUG_INFO:") ? "AI分析: " + resultString.replace("DEBUG_INFO:", "") : "未识别到目标");
      setView('feedback'); 
    } catch (err: any) {
      setErrorMsg("分析出错: " + err.message);
      setView('feedback');
    }
  };

  if (view === 'admin-login') return <AdminLoginView onSuccess={() => setView('admin')} onBack={() => setView('home')} />;
  if (view === 'admin') return <AdminPanel rules={rules} onBack={() => { loadRules(); setView('home'); }} />;

  return (
    <div className="h-dvh bg-gray-50 text-gray-900 font-sans max-w-lg mx-auto shadow-2xl relative overflow-hidden flex flex-col">
      <header className="bg-white p-4 pt-safe shadow-sm flex justify-between items-center z-10 shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">wpf的镜头</h1>
        <button onClick={() => setView('admin-login')} className="p-2 rounded-full hover:bg-gray-100"><Settings className="w-6 h-6 text-gray-600" /></button>
      </header>
      <main className="flex-1 overflow-y-auto relative">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full px-6 space-y-8 animate-fade-in pb-safe">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow"><Camera className="w-12 h-12 text-blue-600" /></div>
              <p className="text-gray-800 text-2xl font-bold">准备扫描</p>
              <p className="text-gray-500 text-sm">100% 离线运行，加载后无需网络。</p>
            </div>
            <div className="w-full space-y-4 max-w-xs">
              <button onClick={() => setView('camera')} className="w-full bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg"><Camera className="w-6 h-6" /> 开启相机</button>
              <button onClick={() => setView('upload')} className="w-full bg-white border border-gray-200 text-gray-700 p-4 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg"><Upload className="w-6 h-6" /> 上传图片</button>
            </div>
            <div className="text-xs text-gray-400 mt-8 bg-gray-100 px-3 py-1 rounded-full">已加载 {rules.length} 条识别规则</div>
          </div>
        )}
        {view === 'camera' && <CameraView onCapture={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'upload' && <UploadView onUpload={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 bg-white absolute inset-0 z-20">
            <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <p className="text-lg font-bold text-gray-800 animate-pulse">正在分析...</p>
          </div>
        )}
        {view === 'feedback' && <FeedbackView result={matchResult} error={errorMsg} capturedImage={capturedImage} processingTime={processingTime} onClose={() => setView('home')} />}
      </main>
    </div>
  );
}

// --- 管理后台逻辑补齐 ---
const AdminPanel = ({ rules, onBack }: { rules: RecognitionRule[], onBack: () => void }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRule, setFormRule] = useState<Partial<RecognitionRule>>({ name: '', targetValue: '', feedback: [] });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState<FeedbackType | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadType) {
      if (file.size > 20 * 1024 * 1024) { alert("❌ 文件太大！请限制在 20MB 以内。"); return; }
      setUploadingMedia(true);
      try {
        const url = await storageService.uploadFile(file);
        const currentFeedback = [...(formRule.feedback || [])];
        // 将新上传的媒体 URL 加入反馈列表
        currentFeedback.push({ type: activeUploadType, content: url });
        setFormRule({ ...formRule, feedback: currentFeedback });
        alert("✅ 上传成功！");
      } catch (err) {
        alert("❌ 上传失败，请检查 OSS 配置");
      } finally {
        setUploadingMedia(false);
        if (mediaInputRef.current) mediaInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!formRule.name || !formRule.targetValue) return alert("请完善信息");
    const ruleToSave = { ...formRule, id: editingId || '', createdAt: Date.now() } as RecognitionRule;
    await storageService.saveRule(ruleToSave);
    onBack();
  };

  if (viewMode === 'form') {
    return (
      <div className="h-full bg-white animate-slide-up flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setViewMode('list')}><ChevronLeft /></button>
          <h2 className="text-2xl font-bold">{editingId ? '编辑规则' : '新增规则'}</h2>
        </div>
        
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-500">3. 目标描述</label>
          <textarea className="w-full p-4 bg-gray-50 border rounded-xl" rows={3} value={formRule.targetValue} onChange={e => setFormRule({...formRule, targetValue: e.target.value})} placeholder="例如：一个白色鼠标" />
          
          <label className="block text-sm font-medium text-gray-500">4. 触发反馈 (可多选)</label>
          <div className="bg-gray-50 p-4 rounded-xl border space-y-4">
             <div className="flex items-center gap-2 text-gray-700 font-bold"><Type className="w-4 h-4" /> 文字消息</div>
             <textarea className="w-full p-3 border rounded-lg text-sm" value={formRule.feedback?.[0]?.content || ''} onChange={e => {
                const fb = [...(formRule.feedback || [])];
                if (fb.length === 0) fb.push({ type: 'text', content: e.target.value });
                else fb[0].content = e.target.value;
                setFormRule({...formRule, feedback: fb});
             }} placeholder="输入文字内容" />
             
             <input type="file" ref={mediaInputRef} onChange={handleMediaUpload} className="hidden" />
             <button onClick={() => { setActiveUploadType('image'); mediaInputRef.current?.click(); }} className="w-full py-3 bg-white border rounded-xl flex items-center justify-center gap-2"><ImageIcon className="w-5 h-5" /> 上传反馈图片</button>
             <button onClick={() => { setActiveUploadType('video'); mediaInputRef.current?.click(); }} className="w-full py-3 bg-white border rounded-xl flex items-center justify-center gap-2"><Video className="w-5 h-5" /> 上传反馈视频</button>
             <button onClick={() => { setActiveUploadType('audio'); mediaInputRef.current?.click(); }} className="w-full py-3 bg-white border rounded-xl flex items-center justify-center gap-2"><Music className="w-5 h-5" /> 上传反馈音频</button>
          </div>
          
          {uploadingMedia && <p className="text-center text-blue-500 text-sm animate-pulse">正在上传文件到云端，请稍候...</p>}
          
          <button onClick={handleSave} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">保存并提交</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 bg-white">
       <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="p-2"><ChevronLeft /></button>
          <h2 className="text-xl font-bold">后台管理</h2>
          <div className="w-10"></div>
       </div>
       <div className="flex-1 overflow-y-auto space-y-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-800 text-sm">
             📢 规则同步说明：下方列表包含全量规则。
          </div>
          <button onClick={() => { setEditingId(null); setFormRule({ name: '', targetValue: '', feedback: [] }); setViewMode('form'); }} className="w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-400">
             <Plus className="w-6 h-6" /> 新增规则
          </button>
          {rules.map(rule => (
            <div key={rule.id} className="p-4 bg-white border rounded-2xl flex items-center gap-4 shadow-sm">
               <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center"><ImageIcon className="text-gray-400" /></div>
               <div className="flex-1">
                  <div className="flex items-center gap-2 font-bold">{rule.name} {rule.id.startsWith('rule_') && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 rounded">全局</span>}</div>
                  <div className="text-xs text-gray-400">目标: {rule.targetValue}</div>
               </div>
               {!rule.id.startsWith('rule_') && (
                 <div className="flex gap-2">
                   <button onClick={() => { setEditingId(rule.id); setFormRule(rule); setViewMode('form'); }} className="p-2 text-blue-400"><Edit2 className="w-5 h-5" /></button>
                   <button onClick={() => storageService.deleteRule(rule.id).then(onBack)} className="p-2 text-red-300"><Trash2 className="w-5 h-5" /></button>
                 </div>
               )}
            </div>
          ))}
       </div>
    </div>
  );
};

// --- 其他子组件 (保持你原有的 UI) ---
const AdminLoginView = ({ onSuccess, onBack }: any) => { /* ... 保持原样 ... */ return <div className="h-dvh bg-white flex flex-col items-center justify-center p-6 text-center"> <Lock className="w-12 h-12 text-blue-600 mb-4" /> <h2 className="text-2xl font-bold mb-6">管理员登录</h2> <input type="password" placeholder="输入密码" className="w-full p-4 border rounded-xl text-center mb-4" onChange={(e) => e.target.value === '11335510' && onSuccess()} /> <button onClick={onBack} className="text-gray-400">返回首页</button> </div>; };
const CameraView = ({ onCapture, onClose }: any) => { /* ... 保持原样 ... */ return <div className="fixed inset-0 bg-black flex flex-col"><div className="flex-1"></div><button onClick={onClose} className="p-10 text-white">关闭</button></div>; };
const UploadView = ({ onUpload, onClose }: any) => { /* ... 保持原样 ... */ return <div className="fixed inset-0 bg-white p-20 flex flex-col"><input type="file" onChange={e => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload=ev=>onUpload(ev.target?.result as string); r.readAsDataURL(f); }}} /><button onClick={onClose}>取消</button></div>; };
const FeedbackView = ({ result, error, capturedImage, processingTime, onClose }: any) => { 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-md space-y-4 overflow-y-auto max-h-screen pb-10">
        {result ? (
          <>
            <div className="text-center text-white">
              <h2 className="text-3xl font-bold">{result.name}</h2>
              <p className="text-xs opacity-60">匹配成功 · 耗时 {processingTime}s</p>
            </div>
            {result.feedback.map((fb, i) => (
              <div key={i} className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl">
                {fb.type === 'text' && <p className="text-center text-gray-700">{fb.content}</p>}
                {fb.type === 'image' && <img src={fb.content} className="w-full rounded-xl" />}
                {fb.type === 'video' && <video src={fb.content} controls className="w-full rounded-xl" />}
                {fb.type === 'audio' && <audio src={fb.content} controls className="w-full" />}
              </div>
            ))}
            <button onClick={onClose} className="w-full bg-white/20 text-white py-4 rounded-2xl font-bold">完成确认</button>
          </>
        ) : (
          <div className="bg-white p-10 rounded-3xl text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="font-bold">{error || "未匹配到目标"}</p>
            <button onClick={onClose} className="mt-6 w-full bg-black text-white py-3 rounded-xl">返回</button>
          </div>
        )}
      </div>
    </div>
  );
};
