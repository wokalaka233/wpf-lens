import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, 
  AlertCircle, ChevronLeft, Image as ImageIcon, Video, Music, 
  Sparkles, PlayCircle, Loader2, Type, Edit2, Lock 
} from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import { RecognitionRule, FeedbackType } from './types';
import { GLOBAL_RULES } from './defaultRules';

// --- 1. 管理后台主面板 (增强鲁棒性，严防白屏) ---
const AdminPanel = ({ onBack }: { onBack: () => void }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [localRules, setLocalRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({ name: '', targetValue: '', feedback: [{type:'text', content:''}] });
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);
  const [upType, setUpType] = useState<FeedbackType | null>(null);

  // 内部加载数据，防止父组件传递延迟导致的白屏
  const loadLocalData = async () => {
    setLoading(true);
    try {
      const cloud = await storageService.getRules();
      setLocalRules(Array.isArray(cloud) ? cloud : []);
    } catch (e) {
      setLocalRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLocalData(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && upType) {
      setUploading(true);
      try {
        const url = await storageService.uploadFile(file);
        const fbs = [...form.feedback, { type: upType, content: url }];
        setForm({ ...form, feedback: fbs });
        alert("文件上传成功");
      } catch (err) { alert("上传失败，请检查OSS设置"); }
      finally { setUploading(false); if(mediaRef.current) mediaRef.current.value=''; }
    }
  };

  if (loading) return (
    <div className="h-full bg-white flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      <p className="font-bold text-slate-400 text-sm">正在加载云端规则...</p>
    </div>
  );

  if (viewMode === 'form') return (
    <div className="h-full bg-white flex flex-col p-6 space-y-6 overflow-y-auto pb-24 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-4">
        <button onClick={() => setViewMode('list')} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft /></button>
        <h2 className="text-xl font-bold text-slate-800">配置识别规则</h2>
      </div>
      <div className="space-y-6">
        <div className="space-y-2"><label className="text-xs font-bold text-slate-400">1. 规则名称</label><input className="w-full p-5 bg-slate-50 rounded-3xl border-none font-bold outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例如：我的鼠标" /></div>
        <div className="space-y-2"><label className="text-xs font-bold text-slate-400">2. 识别详细描述</label><textarea className="w-full p-5 bg-slate-50 rounded-3xl border-none h-28 outline-none" value={form.targetValue} onChange={e => setForm({...form, targetValue: e.target.value})} placeholder="详细描述目标特征..." /></div>
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400">3. 触发反馈内容</label>
          <div className="bg-slate-50 p-5 rounded-[2.5rem] space-y-4">
            <textarea className="w-full p-4 bg-white rounded-2xl text-sm border-none shadow-sm outline-none" value={form.feedback[0]?.content} onChange={e => { const f = [...form.feedback]; f[0].content = e.target.value; setForm({...form, feedback:f}); }} placeholder="输入反馈文字..." />
            <input type="file" ref={mediaRef} className="hidden" onChange={handleUpload} />
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => { setUpType('image'); mediaRef.current?.click(); }} className="w-full p-4 bg-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm active:scale-95 transition-all text-slate-600"><ImageIcon className="w-4 h-4" /> 上传反馈图片</button>
              <button onClick={() => { setUpType('video'); mediaRef.current?.click(); }} className="w-full p-4 bg-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm active:scale-95 transition-all text-slate-600"><Video className="w-4 h-4" /> 上传反馈视频</button>
              <button onClick={() => { setUpType('audio'); mediaRef.current?.click(); }} className="w-full p-4 bg-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm active:scale-95 transition-all text-slate-600"><Music className="w-4 h-4" /> 上传反馈音频</button>
            </div>
          </div>
        </div>
        {uploading && <div className="text-center text-blue-500 text-xs animate-pulse font-bold">同步云端中...</div>}
        <button onClick={async () => { await storageService.saveRule(form); loadLocalData(); setViewMode('list'); }} className="w-full bg-blue-600 text-white p-6 rounded-[2.5rem] font-bold shadow-xl active:scale-95 transition-all text-lg">保存并发布规则</button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6 bg-white overflow-hidden animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft /></button>
        <h2 className="text-xl font-bold">后台管理</h2>
        <div className="w-10"></div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pb-20">
        <button onClick={() => { setForm({ name: '', targetValue: '', feedback: [{type:'text', content:''}] }); setViewMode('form'); }} className="w-full p-10 border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-blue-400 transition-all">
          <Plus className="w-8 h-8" /><span className="font-bold text-xs">新增识别规则</span>
        </button>
        {localRules.map((rule: any) => (
          <div key={rule.objectId || rule.id} className="p-5 bg-white border border-slate-100 rounded-[2.5rem] flex items-center gap-4 shadow-sm active:bg-slate-50 transition-all">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center"><ImageIcon className="text-slate-300 w-5 h-5" /></div>
            <div className="flex-1 overflow-hidden"><div className="font-bold text-slate-800 truncate">{rule.name || '未命名'}</div><div className="text-[10px] text-slate-400 break-all line-clamp-1">{rule.targetValue}</div></div>
            {!(rule.id || '').toString().startsWith('rule_') && (
              <div className="flex gap-1">
                <button onClick={() => { setForm(rule); setViewMode('form'); }} className="p-2 text-blue-300"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => storageService.deleteRule(rule.objectId).then(loadLocalData)} className="p-2 text-red-200"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 其他子组件 (FeedbackView, CameraView, etc.) ---
const FeedbackView = ({ result, error, capturedImage, processingTime, onClose }: any) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      {capturedImage && (
        <div className="absolute inset-0 z-0 overflow-hidden">
           {/* 🛑 核心需求：虚化减弱 blur-lg */}
           <img src={capturedImage} className="w-full h-full object-cover scale-110 blur-lg opacity-60" alt="背景" />
           <div className="absolute inset-0 bg-black/50"></div>
        </div>
      )}
      <div className="z-10 w-full max-w-md space-y-6 flex flex-col items-center max-h-[90vh] overflow-y-auto scrollbar-hide pb-20">
        {result ? (
          <>
            <div className="text-center text-white drop-shadow-2xl py-6">
              <h2 className="text-5xl font-bold mb-2 tracking-tighter">{result.name}</h2>
              <p className="text-[10px] opacity-60 font-bold tracking-[0.3em]">匹配成功 · {processingTime.toFixed(2)}秒</p>
            </div>
            {result.feedback.map((fb: any, i: number) => (
              <div key={i} className="w-full bg-white/95 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-700">
                {fb.type === 'text' && <p className="text-center text-slate-800 text-xl font-bold leading-snug">{fb.content}</p>}
                {fb.type === 'image' && <img src={fb.content} className="w-full rounded-[2rem] shadow-md" referrerPolicy="no-referrer" alt="反馈" />}
                {/* 🛑 核心需求：视频自动播放 (不静音) */}
                {fb.type === 'video' && <video src={fb.content} autoPlay playsInline controls className="w-full rounded-[2rem] bg-black shadow-inner" />}
                {fb.type === 'audio' && <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[2.5rem]"><audio src={fb.content} autoPlay controls className="flex-1" /></div>}
              </div>
            ))}
            <button onClick={onClose} className="w-full bg-white/20 hover:bg-white/30 text-white p-6 rounded-[2.5rem] font-bold text-2xl backdrop-blur-3xl border border-white/20 transition-all active:scale-95 shadow-2xl mt-4">完成确认</button>
          </>
        ) : (
          <div className="bg-white/95 backdrop-blur-xl p-12 rounded-[4rem] text-center space-y-8 shadow-2xl animate-in zoom-in">
             <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
             <div className="space-y-2"><p className="text-3xl font-bold text-slate-800">未匹配到目标</p><p className="text-slate-400 font-medium text-xs break-all opacity-80 px-4">系统分析: {error}</p></div>
             <button onClick={onClose} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-bold text-xl">返回重试</button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 主 App 组件 ---
export default function App() {
  const [view, setView] = useState<any>('home');
  const [rules, setRules] = useState<RecognitionRule[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<RecognitionRule | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  useEffect(() => {
    const init = async () => {
      const cloud = await storageService.getRules();
      setRules([...GLOBAL_RULES, ...(Array.isArray(cloud) ? cloud : [])]);
      localAiService.loadModels();
    };
    init();
  }, []);

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
  if (view === 'admin') return <AdminPanel onBack={() => setView('home')} />;

  return (
    <div className="h-dvh bg-white text-slate-900 font-sans max-w-lg mx-auto relative overflow-hidden flex flex-col">
      <header className="p-6 pt-safe flex justify-between items-center z-10 shrink-0">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">wpf的镜头</h1>
        <button onClick={() => setView('admin-login')} className="p-3 rounded-2xl bg-slate-50 active:scale-90 transition-all text-slate-400"><Settings className="w-6 h-6" /></button>
      </header>

      <main className="flex-1 overflow-y-auto relative">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full px-10 space-y-12 animate-in fade-in duration-700">
            <div className="relative"><div className="w-36 h-36 bg-blue-600 rounded-[3.5rem] flex items-center justify-center shadow-2xl shadow-blue-200 animate-bounce-slow"><Camera className="w-16 h-16 text-white" /></div><Sparkles className="absolute -top-2 -right-2 text-blue-400 w-10 h-10 animate-pulse" /></div>
            <div className="text-center font-bold text-4xl text-slate-800 tracking-tighter">准备扫描</div>
            <div className="w-full space-y-5 max-w-xs pb-10">
              <button onClick={() => setView('camera')} className="w-full bg-blue-600 text-white p-6 rounded-[2.5rem] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-xl">开启相机</button>
              <button onClick={() => setView('upload')} className="w-full bg-slate-50 text-slate-400 p-6 rounded-[2.5rem] active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-xl italic">上传图片</button>
            </div>
          </div>
        )}

        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full space-y-10 bg-white absolute inset-0 z-[120] animate-in fade-in">
             <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                {/* 🛑 核心细节：识别中有拍摄照片缩略图 */}
                {capturedImage && <img src={capturedImage} className="w-32 h-32 object-cover rounded-full shadow-lg border-4 border-white animate-pulse" alt="预览" />}
             </div>
             <p className="text-2xl font-bold text-slate-800">正在极速压缩并分析...</p>
          </div>
        )}

        {view === 'camera' && <CameraView onCapture={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'upload' && <UploadView onUpload={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'feedback' && <FeedbackView result={matchResult} error={errorMsg} capturedImage={capturedImage} processingTime={processingTime} onClose={() => setView('home')} />}
      </main>
    </div>
  );
}

// --- 辅助：管理员登录视图 ---
const AdminLoginView = ({ onSuccess, onBack }: any) => {
  return (
    <div className="h-dvh bg-white flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in">
      <Lock className="w-12 h-12 text-blue-600" />
      <h2 className="text-2xl font-bold text-slate-800">管理员登录</h2>
      <input type="password" pattern="[0-9]*" inputMode="numeric" autoFocus className="w-full max-w-xs p-6 bg-slate-50 rounded-[2.5rem] text-center text-3xl font-bold tracking-[0.5em] focus:ring-4 ring-blue-50 outline-none" onChange={e => e.target.value === '11335510' && onSuccess()} />
      <button onClick={onBack} className="text-slate-300 font-bold">返回</button>
    </div>
  );
};

// --- 辅助：相机视图 (镜头反转) ---
const CameraView = ({ onCapture, onClose }: any) => {
  const vRef = useRef<HTMLVideoElement>(null);
  const [isFront, setIsFront] = useState(false);
  const init = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: isFront ? 'user' : 'environment' } });
      if(vRef.current) vRef.current.srcObject = s;
    } catch(e) { alert("相机启动失败"); }
  }, [isFront]);
  useEffect(() => { init(); return () => (vRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); }, [init]);
  return (
    <div className="fixed inset-0 bg-black z-[150] flex flex-col h-dvh">
      <video ref={vRef} autoPlay playsInline muted className={`flex-1 object-cover ${isFront ? 'scale-x-[-1]' : ''}`} />
      <div className="p-10 pb-safe-offset-4 flex justify-between items-center bg-black/40 backdrop-blur-2xl absolute bottom-0 left-0 right-0">
        <button onClick={onClose} className="p-5 bg-white/10 rounded-full text-white"><X /></button>
        <button onClick={() => {
          const c = document.createElement('canvas'); const v = vRef.current!;
          c.width = v.videoWidth; c.height = v.videoHeight;
          const ctx = c.getContext('2d')!; if(isFront) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
          ctx.drawImage(v, 0, 0); onCapture(c.toDataURL('image/jpeg', 0.8));
        }} className="w-24 h-24 bg-white rounded-full border-[10px] border-white/20 active:scale-75 shadow-2xl" />
        <button onClick={() => setIsFront(!isFront)} className="p-5 bg-white/10 rounded-full text-white shadow-lg"><RefreshCw /></button>
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
  return <div className="fixed inset-0 bg-white z-[160] flex flex-col items-center justify-center p-10"><Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" /><p className="font-bold text-slate-400">正在调取相册...</p></div>;
};
