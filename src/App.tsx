import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, AlertCircle, ChevronLeft, Image as ImageIcon, Video, Music, Sparkles, PlayCircle, Loader2, Type, Edit2 } from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import { RecognitionRule, FeedbackType } from './types';
import { GLOBAL_RULES } from './defaultRules';

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
    setCapturedImage(base64);
    setView('processing');
    const start = Date.now();
    try {
      const resultId = await localAiService.analyzeImageLocal(base64, rules);
      setProcessingTime((Date.now() - start) / 1000);
      const matched = rules.find(r => r.id === resultId);
      if (matched) { setMatchResult(matched); setErrorMsg(null); }
      else { setMatchResult(null); setErrorMsg(resultId); }
      setView('feedback');
    } catch (e: any) { setErrorMsg(e.message); setView('feedback'); }
  };

  if (view === 'admin-login') return <AdminLoginView onSuccess={() => setView('admin')} onBack={() => setView('home')} />;
  if (view === 'admin') return <AdminPanel rules={rules} onBack={() => { loadData(); setView('home'); }} />;

  return (
    <div className="h-dvh bg-[#F8FAFC] text-slate-900 font-sans max-w-lg mx-auto relative overflow-hidden flex flex-col">
      <header className="p-6 pt-safe flex justify-between items-center z-10 shrink-0">
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic">wpf的镜头</h1>
        <button onClick={() => setView('admin-login')} className="p-3 rounded-2xl bg-slate-50 active:scale-90 transition-all text-slate-400"><Settings className="w-6 h-6" /></button>
      </header>

      <main className="flex-1 overflow-y-auto relative">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full px-10 space-y-12 animate-in fade-in duration-700 pb-safe">
            <div className="relative">
              <div className="w-36 h-36 bg-blue-600 rounded-[3.5rem] flex items-center justify-center shadow-2xl shadow-blue-200 animate-bounce-slow">
                <Camera className="w-16 h-16 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-blue-400 w-10 h-10 animate-pulse" />
            </div>
            <div className="text-center"><h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">准备扫描</h2></div>
            <div className="w-full space-y-5 max-w-xs pb-10">
              <button onClick={() => setView('camera')} className="w-full bg-blue-600 text-white p-6 rounded-[2.5rem] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 font-black text-xl">开启相机</button>
              <button onClick={() => setView('upload')} className="w-full bg-white border-2 border-slate-100 text-slate-600 p-6 rounded-[2.5rem] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 font-black text-xl italic">上传图片</button>
            </div>
          </div>
        )}

        {view === 'camera' && <CameraView onCapture={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'upload' && <UploadView onUpload={handleAnalyze} onClose={() => setView('home')} />}

        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full space-y-10 bg-white absolute inset-0 z-20 animate-in fade-in">
             <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                {capturedImage && <img src={capturedImage} className="w-32 h-32 object-cover rounded-full shadow-lg border-4 border-white" alt="thumb" />}
             </div>
             <div className="text-center space-y-3">
                <p className="text-2xl font-black text-slate-800 italic">正在极速压缩并分析...</p>
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">AI 正在识别画面内容</p>
             </div>
          </div>
        )}

        {view === 'feedback' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in">
            {capturedImage && (
              <div className="absolute inset-0 z-0 overflow-hidden">
                 {/* 🛑 核心修复：减弱虚化效果，改用 blur-2xl */}
                 <img src={capturedImage} className="w-full h-full object-cover scale-110 blur-2xl opacity-60" alt="bg" />
                 <div className="absolute inset-0 bg-black/40"></div>
              </div>
            )}
            <div className="z-10 w-full max-w-md space-y-6 flex flex-col items-center max-h-[90vh] overflow-y-auto scrollbar-hide pb-20">
              {matchResult ? (
                <>
                  <div className="text-center text-white drop-shadow-2xl py-6">
                    <h2 className="text-5xl font-black mb-2 italic tracking-tighter">{matchResult.name}</h2>
                    <p className="text-[10px] opacity-50 font-black tracking-[0.3em] uppercase">耗时 {processingTime.toFixed(2)}s</p>
                  </div>
                  {matchResult.feedback.map((fb: any, i: number) => (
                    <div key={i} className="w-full bg-white/95 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-700">
                      {fb.type === 'text' && <p className="text-center text-slate-800 text-xl font-black leading-snug">{fb.content}</p>}
                      {fb.type === 'image' && <img src={fb.content} className="w-full rounded-[2rem] shadow-md" referrerPolicy="no-referrer" alt="img" />}
                      {fb.type === 'video' && <video src={fb.content} autoPlay playsInline controls className="w-full rounded-[2rem] bg-black shadow-inner" />}
                      {fb.type === 'audio' && <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[2.5rem]"><audio src={fb.content} autoPlay controls className="flex-1" /></div>}
                    </div>
                  ))}
                  <button onClick={() => setView('home')} className="w-full bg-white/20 text-white p-6 rounded-[2.5rem] font-black text-2xl backdrop-blur-3xl border border-white/20 transition-all active:scale-95 shadow-2xl mt-4">完成确认</button>
                </>
              ) : (
                <div className="bg-white/95 backdrop-blur-xl p-12 rounded-[4rem] text-center space-y-8 shadow-2xl animate-in zoom-in">
                   <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
                   <p className="text-3xl font-black text-slate-800 italic tracking-tighter">未匹配到目标</p>
                   <p className="text-slate-400 font-medium text-xs break-all opacity-80 px-4">{errorMsg}</p>
                   <button onClick={() => setView('home')} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl">返回重试</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- 📸 恢复完整的后台管理 UI ---
const AdminPanel = ({ rules, onBack }: { rules: RecognitionRule[], onBack: () => void }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: '', targetValue: '', feedback: [] });
  const [uploading, setUploading] = useState(false);
  const [upType, setUpType] = useState<FeedbackType | null>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const startAdd = () => { setEditingId(null); setForm({ name: '', targetValue: '', feedback: [{type:'text', content:''}] }); setViewMode('form'); };
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && upType) {
      setUploading(true);
      try {
        const url = await storageService.uploadFile(file);
        const fbs = [...form.feedback, { type: upType, content: url }];
        setForm({ ...form, feedback: fbs });
        alert("上传成功！");
      } catch (err) { alert("上传失败"); }
      finally { setUploading(false); }
    }
  };

  if (viewMode === 'form') return (
    <div className="h-full bg-white flex flex-col p-6 space-y-6 overflow-y-auto pb-24">
      <div className="flex items-center gap-4"><button onClick={() => setViewMode('list')} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft /></button><h2 className="text-xl font-black">新增规则</h2></div>
      <div className="space-y-6">
        <div className="space-y-2"><label className="text-sm font-bold text-slate-400">1. 规则名称</label><input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例如：我的鼠标" /></div>
        <div className="space-y-2"><label className="text-sm font-bold text-slate-400">2. 识别目标描述</label><textarea className="w-full p-4 bg-slate-50 rounded-2xl border-none h-24" value={form.targetValue} onChange={e => setForm({...form, targetValue: e.target.value})} placeholder="描述AI识别的特征..." /></div>
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-400">3. 触发反馈 (可多选)</label>
          <div className="bg-slate-50 p-4 rounded-[2.5rem] space-y-4">
            <textarea className="w-full p-4 bg-white rounded-2xl text-sm border-none shadow-sm" value={form.feedback[0]?.content} onChange={e => { const f = [...form.feedback]; f[0].content = e.target.value; setForm({...form, feedback:f}); }} placeholder="输入反馈文字" />
            <input type="file" ref={mediaRef} className="hidden" onChange={handleUpload} />
            <button onClick={() => { setUpType('image'); mediaRef.current?.click(); }} className="w-full p-4 bg-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm"><ImageIcon className="w-4 h-4" /> 上传反馈图片</button>
            <button onClick={() => { setUpType('video'); mediaRef.current?.click(); }} className="w-full p-4 bg-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm"><Video className="w-4 h-4" /> 上传反馈视频</button>
            <button onClick={() => { setUpType('audio'); mediaRef.current?.click(); }} className="w-full p-4 bg-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm"><Music className="w-4 h-4" /> 上传反馈音频</button>
          </div>
        </div>
        {uploading && <div className="text-center text-blue-500 text-xs animate-pulse">正在上传文件到云端...</div>}
        <button onClick={async () => { await storageService.saveRule({ ...form, id: `rule_${Date.now()}` }); onBack(); }} className="w-full bg-blue-600 text-white p-5 rounded-[2rem] font-black shadow-xl">保存并提交</button>
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
            <div className="flex-1"><div className="font-bold text-slate-800">{rule.name}</div><div className="text-[10px] text-slate-400 break-all">{rule.targetValue}</div></div>
            {!rule.id.startsWith('rule_') && <button onClick={() => storageService.deleteRule(rule.id).then(onBack)} className="p-2 text-red-200"><Trash2 className="w-5 h-5" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 其他子组件：登录、相机等 ---
const AdminLoginView = ({ onSuccess, onBack }: any) => {
  return (
    <div className="h-dvh bg-white flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in">
      <div className="w-20 h-20 bg-blue-50 rounded-[2.5rem] flex items-center justify-center"><Lock className="text-blue-600 w-8 h-8" /></div>
      <div className="text-center"><h2 className="text-3xl font-black italic">管理登录</h2><p className="text-slate-400 text-sm mt-1 tracking-widest uppercase">Input Admin Code</p></div>
      <input type="password" pattern="[0-9]*" inputMode="numeric" className="w-full max-w-xs p-8 bg-slate-50 rounded-[2.5rem] text-center text-4xl font-black tracking-[0.5em] focus:ring-4 ring-blue-50 transition-all outline-none" autoFocus onChange={e => e.target.value === '11335510' && onSuccess()} />
      <button onClick={onBack} className="text-slate-300 font-bold hover:text-slate-400">CANCEL</button>
    </div>
  );
};

const CameraView = ({ onCapture, onClose }: any) => {
  const vRef = useRef<HTMLVideoElement>(null);
  const [isFront, setIsFront] = useState(false);
  const init = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: isFront ? 'user' : 'environment' } });
    if(vRef.current) vRef.current.srcObject = s;
  }, [isFront]);
  useEffect(() => { init(); return () => (vRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); }, [init]);
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-dvh overflow-hidden">
      <video ref={vRef} autoPlay playsInline muted className={`flex-1 object-cover ${isFront ? 'scale-x-[-1]' : ''}`} />
      <div className="p-10 pb-safe-offset-4 flex justify-between items-center bg-black/40 backdrop-blur-2xl absolute bottom-0 left-0 right-0">
        <button onClick={onClose} className="p-5 bg-white/10 rounded-full text-white"><X /></button>
        <button onClick={() => {
          const c = document.createElement('canvas'); const v = vRef.current!;
          c.width = v.videoWidth; c.height = v.videoHeight;
          const ctx = c.getContext('2d')!; if(isFront) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
          ctx.drawImage(v, 0, 0); onCapture(c.toDataURL('image/jpeg', 0.8));
        }} className="w-24 h-24 bg-white rounded-full border-[10px] border-white/20 active:scale-75 transition-all" />
        <button onClick={() => setIsFront(!isFront)} className="p-5 bg-white/10 rounded-full text-white"><RefreshCw /></button>
      </div>
    </div>
  );
};

const UploadView = ({ onUpload, onClose }: any) => {
  useEffect(() => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = (e: any) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onload = ev => onUpload(ev.target?.result); r.readAsDataURL(f); } else onClose(); };
    i.click();
  }, [onUpload, onClose]);
  return <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-10"><Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" /><p className="font-black italic">正在调起相册...</p></div>;
};
