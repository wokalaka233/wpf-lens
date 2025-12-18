import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, AlertCircle, ChevronLeft, Image as ImageIcon, Type, Video, Music, Lock, Edit2, Loader2, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import { RecognitionRule } from './types';
import { GLOBAL_RULES } from './defaultRules';

export default function App() {
  const [view, setView] = useState<any>('home');
  const [rules, setRules] = useState<RecognitionRule[]>([]);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  const loadData = async () => {
    const cloud = await storageService.getRules();
    setRules([...GLOBAL_RULES, ...cloud.filter(c => !GLOBAL_RULES.find(g => g.id === c.id))]);
  };

  useEffect(() => { loadData(); localAiService.loadModels(); }, []);

  const handleAnalyze = async (img: string) => {
    setView('processing');
    const start = Date.now();
    try {
      setCapturedImage(img);
      const result = await localAiService.analyzeImageLocal(img, rules);
      setProcessingTime((Date.now() - start) / 1000);
      
      const matched = rules.find(r => r.id === result);
      if (matched) { setMatchResult(matched); setView('feedback'); }
      else { setErrorMsg("未匹配到目标"); setView('feedback'); }
    } catch (e: any) { setErrorMsg(e.message); setView('feedback'); }
  };

  if (view === 'admin-login') return <AdminLoginView onSuccess={() => setView('admin')} onBack={() => setView('home')} />;
  if (view === 'admin') return <AdminPanel rules={rules} onBack={() => { loadData(); setView('home'); }} />;

  return (
    <div className="h-dvh bg-[#F8FAFC] text-slate-900 font-sans max-w-lg mx-auto relative overflow-hidden flex flex-col selection:bg-blue-100">
      <header className="bg-white/80 backdrop-blur-md p-5 pt-safe flex justify-between items-center z-20 shrink-0 border-b border-slate-100">
        <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">wpf的镜头</h1>
        <button onClick={() => setView('admin-login')} className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all active:scale-90"><Settings className="w-5 h-5 text-slate-500" /></button>
      </header>
      
      <main className="flex-1 overflow-y-auto relative p-6">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full space-y-10 animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="w-32 h-32 bg-blue-600 rounded-[3rem] flex items-center justify-center shadow-2xl shadow-blue-200 animate-pulse-slow">
                <Camera className="w-16 h-16 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-yellow-400 w-8 h-8" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-800">开始探索</h2>
              <p className="text-slate-400 font-medium">拍张照片，让 AI 为你揭晓答案</p>
            </div>
            <div className="w-full space-y-4 max-w-xs">
              <button onClick={() => setView('camera')} className="w-full bg-slate-900 text-white p-5 rounded-[2rem] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg">开启相机</button>
              <button onClick={() => setView('upload')} className="w-full bg-white border-2 border-slate-100 text-slate-600 p-5 rounded-[2rem] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg">上传图片</button>
            </div>
          </div>
        )}
        {/* 其他视图保持 UI 逻辑一致性 */}
      </main>
    </div>
  );
}

// --- 后台管理面板：极致圆润版 ---
const AdminPanel = ({ rules, onBack }: any) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState<any>({ name: '', targetValue: '', isStrict: false, feedback: [] });
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!form.name || !form.targetValue) return alert("信息不全");
    await storageService.saveRule({ ...form, id: `cloud_${Date.now()}`, createdAt: Date.now() });
    onBack();
  };

  if (viewMode === 'form') return (
    <div className="h-full bg-white animate-in slide-in-from-bottom duration-300 flex flex-col rounded-t-[3rem] shadow-2xl overflow-hidden border-t border-slate-100">
      <div className="p-8 flex-1 overflow-y-auto space-y-8">
        <div className="flex justify-between items-center">
          <button onClick={() => setViewMode('list')} className="p-3 bg-slate-50 rounded-2xl"><ChevronLeft /></button>
          <h2 className="text-2xl font-black">新增识别规则</h2>
          <div className="w-10"></div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-400 ml-1">1. 规则名称 (展示在结果页)</label>
            <input className="w-full p-5 bg-slate-50 rounded-3xl border-none focus:ring-2 ring-blue-500 transition-all font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例如：杰伦的 CD" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-400 ml-1">2. 详细描述 (AI 严苛匹配开关)</label>
              <button onClick={() => setForm({...form, isStrict: !form.isStrict})} className="transition-all">
                {form.isStrict ? <ToggleRight className="w-10 h-10 text-blue-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
              </button>
            </div>
            <textarea className="w-full p-5 bg-slate-50 rounded-3xl border-none focus:ring-2 ring-blue-500 transition-all min-h-[100px]" value={form.targetValue} onChange={e => setForm({...form, targetValue: e.target.value})} placeholder={form.isStrict ? "请详细描述特征，如：CD封面有JAY的红色艺术字" : "简单描述物体即可"} />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-400 ml-1">3. 触发反馈 (圆润多选区)</label>
            <div className="grid grid-cols-1 gap-3">
               <button onClick={() => { /* 处理上传图片逻辑 */ }} className="w-full p-5 bg-blue-50 text-blue-600 rounded-3xl font-bold flex items-center justify-center gap-2 border-2 border-blue-100 hover:bg-blue-100 transition-all">上传反馈图片</button>
               <button className="w-full p-5 bg-indigo-50 text-indigo-600 rounded-3xl font-bold border-2 border-indigo-100">上传反馈视频</button>
            </div>
          </div>
        </div>
        
        <button onClick={handleSave} className="w-full bg-blue-600 text-white p-6 rounded-[2rem] font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">保存规则</button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6 bg-white space-y-6">
       <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 rounded-2xl"><ChevronLeft /></button>
          <h2 className="text-2xl font-black">后台管理</h2>
       </div>
       <button onClick={() => setViewMode('form')} className="w-full p-8 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-blue-400 hover:border-blue-100 transition-all group">
          <Plus className="w-10 h-10 group-hover:scale-110 transition-transform" />
          <span className="font-bold">点击新增全局识别规则</span>
       </button>
    </div>
  );
};

// --- 反馈结果页：磨砂圆润版 ---
const FeedbackView = ({ result, error, capturedImage, onClose }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 mb-safe">
        {result ? (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-20 h-2 bg-slate-100 rounded-full mb-2"></div>
            <div className="text-center">
              <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">匹配成功</span>
              <h2 className="text-4xl font-black mt-3 text-slate-800">{result.name}</h2>
            </div>
            
            <div className="w-full space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
               {result.feedback.map((fb: any, i: number) => (
                 <div key={i} className="rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-sm">
                   {fb.type === 'text' && <div className="p-6 bg-slate-50 text-slate-600 font-medium text-center">{fb.content}</div>}
                   {fb.type === 'image' && <img src={fb.content} className="w-full object-cover" referrerPolicy="no-referrer" />}
                   {fb.type === 'video' && <video src={fb.content} controls className="w-full" />}
                 </div>
               ))}
            </div>
            
            <button onClick={onClose} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-lg active:scale-95 transition-all">完成确认</button>
          </div>
        ) : (
          <div className="text-center py-10 space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto"><AlertCircle className="text-red-500 w-10 h-10" /></div>
            <p className="font-black text-2xl text-slate-800">未找到匹配项</p>
            <button onClick={onClose} className="w-full bg-slate-100 text-slate-500 p-6 rounded-[2rem] font-bold">返回重试</button>
          </div>
        )}
      </div>
    </div>
  );
};
