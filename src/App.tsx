import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, AlertCircle, ChevronLeft, Image as ImageIcon, Type, Video, Music, Lock, Edit2, Loader2, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import { RecognitionRule, FeedbackType, TargetType } from './types';
import { GLOBAL_RULES } from './defaultRules';

// --- 图片压缩工具 ---
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

export default function App() {
  const [view, setView] = useState<any>('home');
  const [rules, setRules] = useState<RecognitionRule[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<RecognitionRule | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  const loadData = async () => {
    const cloud = await storageService.getRules();
    setRules([...GLOBAL_RULES, ...cloud.filter(c => !GLOBAL_RULES.find(g => g.id === c.id))]);
  };

  useEffect(() => { loadData(); localAiService.loadModels(); }, [view]);

  const handleAnalyze = async (base64: string) => {
    setView('processing');
    const start = Date.now();
    try {
      const compressed = await compressImage(base64);
      setCapturedImage(compressed);
      const resultId = await localAiService.analyzeImageLocal(compressed, rules);
      setProcessingTime((Date.now() - start) / 1000);
      
      const matched = rules.find(r => r.id === resultId);
      if (matched) { setMatchResult(matched); setView('feedback'); }
      else { setErrorMsg("未匹配到目标目标"); setView('feedback'); }
    } catch (e: any) { setErrorMsg(e.message); setView('feedback'); }
  };

  if (view === 'admin-login') return <AdminLoginView onSuccess={() => setView('admin')} onBack={() => setView('home')} />;
  if (view === 'admin') return <AdminPanel rules={rules} onBack={() => { loadData(); setView('home'); }} />;

  return (
    <div className="h-dvh bg-[#F8FAFC] text-slate-900 font-sans max-w-lg mx-auto relative overflow-hidden flex flex-col">
      <header className="bg-white/80 backdrop-blur-md p-5 pt-safe flex justify-between items-center z-10 shrink-0 border-b border-slate-100">
        <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">wpf的镜头</h1>
        <button onClick={() => setView('admin-login')} className="p-2.5 rounded-2xl bg-slate-50 active:scale-90 transition-all"><Settings className="w-5 h-5 text-slate-500" /></button>
      </header>
      <main className="flex-1 overflow-y-auto relative">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full px-6 space-y-10 animate-in fade-in duration-500 pb-safe">
            <div className="relative">
              <div className="w-28 h-28 bg-blue-100 rounded-[2.5rem] flex items-center justify-center animate-bounce-slow">
                <Camera className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-slate-800 text-2xl font-black">准备扫描</p>
              <p className="text-slate-400 text-sm font-medium">通义千问 (Qwen) + 阿里云 OSS</p>
            </div>
            <div className="w-full space-y-4 max-w-xs">
              <button onClick={() => setView('camera')} className="w-full bg-blue-600 text-white p-5 rounded-[2rem] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg"><Camera className="w-6 h-6" /> 开启相机</button>
              <button onClick={() => setView('upload')} className="w-full bg-white border-2 border-slate-100 text-slate-600 p-5 rounded-[2rem] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg"><Upload className="w-6 h-6" /> 上传图片</button>
            </div>
          </div>
        )}
        {view === 'camera' && <CameraView onCapture={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'upload' && <UploadView onUpload={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 bg-white absolute inset-0 z-20">
            <div className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <p className="text-lg font-bold text-slate-800 animate-pulse font-black">AI 正在识别...</p>
          </div>
        )}
        {view === 'feedback' && <FeedbackView result={matchResult} error={errorMsg} capturedImage={capturedImage} processingTime={processingTime} onClose={() => setView('home')} />}
      </main>
    </div>
  );
}

// --- 管理后台 (严防白屏修复版) ---
const AdminPanel = ({ rules, onBack }: { rules: RecognitionRule[], onBack: () => void }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: '', targetValue: '', isStrict: false, feedback: [] });
  const [uploading, setUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const startAdd = () => { setEditingId(null); setForm({ name: '', targetValue: '', isStrict: false, feedback: [{type:'text', content:''}] }); setViewMode('form'); };
  
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await storageService.uploadFile(file);
      const newFB = [...form.feedback, { type, content: url }];
      setForm({ ...form, feedback: newFB });
      alert("上传成功！");
    } catch (err) { alert("上传失败，检查OSS配置"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.name || !form.targetValue) return alert("请填写名称和描述");
    await storageService.saveRule({ ...form, id: editingId || `rule_${Date.now()}` });
    onBack();
  };

  if (viewMode === 'form') return (
    <div className="h-full bg-white flex flex-col p-6 space-y-6 overflow-y-auto pb-20">
      <div className="flex items-center gap-4"><button onClick={() => setViewMode('list')} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft /></button><h2 className="text-xl font-black">新增规则</h2></div>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-400">1. 规则名称</label>
          <input className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 transition-all font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例如：我的鼠标" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between"><label className="text-sm font-bold text-slate-400">2. 详细描述 (更严苛识别)</label><button onClick={() => setForm({...form, isStrict: !form.isStrict})}>{form.isStrict ? <ToggleRight className="text-blue-600 w-8 h-8" /> : <ToggleLeft className="text-slate-300 w-8 h-8" />}</button></div>
          <textarea className="w-full p-4 bg-slate-50 rounded-2xl border-none h-24" value={form.targetValue} onChange={e => setForm({...form, targetValue: e.target.value})} placeholder="请输入AI识别的特征描述..." />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-400">3. 触发反馈 (可多选)</label>
          <div className="bg-slate-50 p-4 rounded-3xl space-y-3">
            <textarea className="w-full p-3 bg-white rounded-xl text-sm border-none" value={form.feedback[0]?.content} onChange={e => { const f = [...form.feedback]; f[0].content = e.target.value; setForm({...form, feedback:f}); }} placeholder="输入反馈文字" />
            <input type="file" ref={mediaInputRef} className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
            <button onClick={() => mediaInputRef.current?.click()} className="w-full p-4 bg-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm"><ImageIcon className="w-4 h-4" /> 上传反馈图片</button>
          </div>
        </div>
        
        {uploading && <p className="text-center text-blue-500 text-xs animate-pulse">正在上传文件...</p>}
        <button onClick={handleSave} className="w-full bg-blue-600 text-white p-5 rounded-[2rem] font-black shadow-lg">保存并提交</button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6 bg-white overflow-hidden">
      <div className="flex justify-between items-center mb-6"><button onClick={onBack} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft /></button><h2 className="text-xl font-black">后台管理</h2><div className="w-10"></div></div>
      <div className="flex-1 overflow-y-auto space-y-4">
        <button onClick={startAdd} className="w-full p-10 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-blue-400 transition-all">
          <Plus className="w-8 h-8" /><span className="font-bold">新增本地测试规则</span>
        </button>
        {rules.map(rule => (
          <div key={rule.id} className="p-5 bg-white border border-slate-100 rounded-[2rem] flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center"><ImageIcon className="text-slate-300 w-5 h-5" /></div>
            <div className="flex-1"><div className="font-bold text-slate-800">{rule.name}</div><div className="text-xs text-slate-400">目标: {rule.targetValue}</div></div>
            {!rule.id.startsWith('rule_') && <button onClick={() => storageService.deleteRule(rule.id).then(onBack)} className="p-2 text-red-200"><Trash2 className="w-5 h-5" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 子组件: 登录/相机/上传/反馈 ---
const AdminLoginView = ({ onSuccess, onBack }: any) => {
  const [pw, setPw] = useState('');
  return (
    <div className="h-dvh bg-white flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in">
      <div className="w-20 h-20 bg-blue-50 rounded-[2.5rem] flex items-center justify-center"><Lock className="text-blue-600 w-8 h-8" /></div>
      <div className="text-center"><h2 className="text-3xl font-black">管理登录</h2><p className="text-slate-400 text-sm mt-1">请输入 8 位管理密码</p></div>
      <input type="password" pattern="[0-9]*" inputMode="numeric" className="w-full max-w-xs p-6 bg-slate-50 rounded-3xl border-none text-center text-3xl font-black tracking-widest focus:ring-4 ring-blue-100 transition-all" autoFocus onChange={e => e.target.value === '11335510' && onSuccess()} />
      <button onClick={onBack} className="text-slate-300 font-bold hover:text-slate-500">取消返回</button>
    </div>
  );
};

const CameraView = ({ onCapture, onClose }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => { if(videoRef.current) videoRef.current.srcObject = s; });
    return () => { (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); };
  }, []);
  const capture = () => {
    const v = videoRef.current; const c = canvasRef.current;
    if(v && c) { c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')?.drawImage(v, 0, 0); onCapture(c.toDataURL('image/jpeg', 0.8)); }
  };
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="p-10 flex justify-between items-center bg-black/50 backdrop-blur">
        <button onClick={onClose} className="p-4 bg-white/10 rounded-full text-white"><X /></button>
        <button onClick={capture} className="w-20 h-20 bg-white rounded-full border-8 border-white/20 active:scale-90 transition-all" />
        <div className="w-14" />
      </div>
    </div>
  );
};

const UploadView = ({ onUpload, onClose }: any) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.click(); }, []);
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-10 animate-in zoom-in">
      <input type="file" accept="image/*" ref={inputRef} className="hidden" onChange={e => {
        const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = ev => onUpload(ev.target?.result as string); r.readAsDataURL(f); }
      }} />
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <p className="font-black text-xl">正在读取相册...</p>
      <button onClick={onClose} className="mt-10 text-slate-300">取消返回</button>
    </div>
  );
};

const FeedbackView = ({ result, error, capturedImage, processingTime, onClose }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
    <div className="w-full max-w-md space-y-6 pb-20 overflow-y-auto max-h-screen">
      {result ? (
        <>
          <div className="text-center text-white"><h2 className="text-4xl font-black mb-2">{result.name}</h2><p className="text-xs opacity-40">匹配成功 · 耗时 {processingTime.toFixed(2)}s</p></div>
          {result.feedback.map((fb: any, i: number) => (
            <div key={i} className="bg-white/95 backdrop-blur rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-500">
              {fb.type === 'text' && <p className="text-center text-slate-800 text-lg font-black leading-relaxed">{fb.content}</p>}
              {fb.type === 'image' && <img src={fb.content} className="w-full rounded-[1.5rem] shadow-sm" referrerPolicy="no-referrer" />}
              {fb.type === 'video' && <video src={fb.content} controls className="w-full rounded-[1.5rem]" playsInline />}
              {fb.type === 'audio' && <audio src={fb.content} controls className="w-full" />}
            </div>
          ))}
          <button onClick={onClose} className="w-full bg-blue-600 text-white p-6 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all">完成确认</button>
        </>
      ) : (
        <div className="bg-white p-10 rounded-[3rem] text-center space-y-6 animate-in zoom-in">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h3 className="text-2xl font-black">未匹配到目标</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black">返回重试</button>
        </div>
      )}
    </div>
  </div>
);
