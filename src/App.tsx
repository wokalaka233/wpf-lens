import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, AlertCircle, CheckCircle2, ChevronLeft, Image as ImageIcon, Type, Video, Music, Lock, Edit2 } from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import { RecognitionRule, FeedbackType, TargetType, FeedbackConfig } from './types';
import { GLOBAL_RULES } from './defaultRules';

storageService.seedInitialData();

type ViewState = 'home' | 'camera' | 'upload' | 'processing' | 'feedback' | 'admin-login' | 'admin';

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_WIDTH = 1024;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [rules, setRules] = useState<RecognitionRule[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<RecognitionRule | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  useEffect(() => {
    const loadRules = async () => {
      const cloudRules = await storageService.getRules();
      const allRules = [...GLOBAL_RULES, ...cloudRules.filter(cr => !GLOBAL_RULES.find(gr => gr.id === cr.id))];
      setRules(allRules);
    };
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
        if (rule) {
          setMatchResult(rule);
          setView('feedback');
          return;
        }
      }

      let showMsg = "未识别到目标";
      if (resultString?.startsWith("DEBUG_INFO:")) {
        showMsg = "AI分析结果: " + resultString.replace("DEBUG_INFO:", "");
      } else if (resultString?.startsWith("ERROR:")) {
        showMsg = resultString;
      }
      
      setErrorMsg(showMsg);
      setView('feedback'); 
    } catch (err: any) {
      setErrorMsg("程序错误: " + err.message);
      console.error(err);
      setView('feedback');
    }
  };

  if (view === 'admin-login') return <AdminLoginView onSuccess={() => setView('admin')} onBack={() => setView('home')} />;
  if (view === 'admin') return <AdminPanel rules={rules} onBack={() => setView('home')} />;

  return (
    <div className="h-dvh bg-gray-50 text-gray-900 font-sans max-w-lg mx-auto shadow-2xl relative overflow-hidden flex flex-col">
      <header className="bg-white p-4 pt-safe shadow-sm flex justify-between items-center z-10 shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">wpf的镜头</h1>
        <button onClick={() => setView('admin-login')} className="p-2 rounded-full hover:bg-gray-100"><Settings className="w-6 h-6 text-gray-600" /></button>
      </header>
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full px-6 space-y-8 animate-fade-in pb-safe">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow"><Camera className="w-12 h-12 text-blue-600" /></div>
              <p className="text-gray-800 text-2xl font-bold">准备扫描</p>
              <p className="text-gray-500 text-sm">云端视觉引擎就绪</p>
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
            <p className="text-lg font-bold text-gray-800 animate-pulse">AI 正在识别...</p>
          </div>
        )}
        {view === 'feedback' && <FeedbackView result={matchResult} error={errorMsg} capturedImage={capturedImage} processingTime={processingTime} onClose={() => setView('home')} />}
      </main>
    </div>
  );
}

// --- 子组件 (重点修复了 AdminPanel 和 FeedbackView) ---

const AdminLoginView = ({ onSuccess, onBack }: { onSuccess: () => void, onBack: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (password === '11335510') onSuccess(); else { setError(true); setTimeout(() => setError(false), 2000); } };
  return (
    <div className="h-dvh bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-blue-50 p-4 rounded-full mb-6"><Lock className="w-8 h-8 text-blue-600" /></div>
      <h2 className="text-2xl font-bold mb-2">管理员登录</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input type="password" pattern="[0-9]*" inputMode="numeric" placeholder="输入密码" className={`w-full text-center text-xl tracking-widest p-4 rounded-xl border-2 outline-none transition-all ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500'}`} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error && <p className="text-red-500 text-sm animate-pulse">密码错误</p>}
        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all">进入后台</button>
      </form>
      <button onClick={onBack} className="mt-8 text-gray-400 text-sm">取消返回</button>
    </div>
  );
};

const CameraView = ({ onCapture, onClose }: { onCapture: (img: string) => void, onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFront, setIsFront] = useState(false);
  const startCamera = useCallback(async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: isFront ? 'user' : 'environment' }, audio: false }); if (videoRef.current) videoRef.current.srcObject = stream; } catch (err) { alert("无法访问相机"); } }, [isFront]);
  useEffect(() => { startCamera(); return () => { const stream = videoRef.current?.srcObject as MediaStream; stream?.getTracks().forEach(track => track.stop()); }; }, [startCamera]);
  const takePhoto = () => { if (videoRef.current && canvasRef.current) { const video = videoRef.current; const canvas = canvasRef.current; canvas.width = video.videoWidth; canvas.height = video.videoHeight; const ctx = canvas.getContext('2d'); if (ctx) { if (isFront) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); } ctx.drawImage(video, 0, 0, canvas.width, canvas.height); onCapture(canvas.toDataURL('image/jpeg', 0.8)); } } };
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-dvh">
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
         <video ref={videoRef} autoPlay playsInline muted className={`absolute w-full h-full object-cover ${isFront ? 'scale-x-[-1]' : ''}`} />
         <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="bg-black/80 p-6 pb-safe flex justify-between items-center">
         <button onClick={onClose} className="p-4 text-white rounded-full bg-white/10"><X /></button>
         <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300" />
         <button onClick={() => setIsFront(!isFront)} className="p-4 text-white rounded-full bg-white/10"><RefreshCw /></button>
      </div>
    </div>
  );
};

const UploadView = ({ onUpload, onClose }: { onUpload: (img: string) => void, onClose: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => ev.target?.result && onUpload(ev.target.result as string); reader.readAsDataURL(file); } };
  useEffect(() => { fileInputRef.current?.click(); }, []);
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6">
       <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFile} className="hidden" />
       <h2 className="text-xl font-bold mb-4">选择图片</h2>
       <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-lg mb-4">打开相册</button>
       <button onClick={onClose} className="text-gray-500">取消</button>
    </div>
  );
};

// 🔴 修复反馈视图：直接使用 URL (不再从本地 IDB 读取)
const FeedbackView = ({ result, error, capturedImage, processingTime, onClose }: { result: RecognitionRule | null, error: string | null, capturedImage: string | null, processingTime: number, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center h-dvh bg-black">
      {capturedImage && <div className="absolute inset-0 z-0 opacity-50"><img src={capturedImage} className="w-full h-full object-cover blur-md" /></div>}
      <div className="z-20 w-full max-w-md p-4 flex flex-col items-center animate-pop-out max-h-screen overflow-y-auto">
        {error ? (
          <div className="bg-white rounded-3xl p-6 w-full text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold mb-2">未识别到目标</h3>
            <p className="text-gray-500 mb-4 text-xs break-all">{error}</p>
            <button onClick={onClose} className="w-full bg-gray-900 text-white py-3 rounded-xl">返回</button>
          </div>
        ) : result ? (
          <div className="w-full space-y-4 pb-10">
            <div className="text-center text-white mb-2 shadow-sm">
               <h2 className="text-3xl font-bold drop-shadow-md">{result.name}</h2>
               <p className="text-white/80 text-xs mt-1">耗时 {processingTime.toFixed(2)}s</p>
            </div>
            {result.feedback.map((fb, idx) => {
               // 🔴 关键修改：直接使用 fb.content 作为 URL
               const isUrl = fb.content.startsWith('http');
               const content = fb.content;
               
               return (
                 <div key={idx} className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/20">
                    {fb.type === 'text' && <p className="text-lg font-medium text-center">{content}</p>}
                    
                    {fb.type === 'image' && isUrl && (
                      <img src={content} className="w-full rounded-xl max-h-60 object-contain bg-black/5" />
                    )}
                    
                    {fb.type === 'video' && isUrl && (
                      <video src={content} controls className="w-full rounded-xl" playsInline autoPlay />
                    )}
                    
                    {fb.type === 'audio' && isUrl && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0 animate-pulse"><Music className="text-white w-5 h-5" /></div>
                        <audio src={content} controls className="flex-1 h-8" autoPlay />
                      </div>
                    )}
                 </div>
               );
            })}
            <button onClick={onClose} className="w-full bg-white/20 backdrop-blur-md text-white py-4 rounded-2xl font-bold mt-4">完成确认</button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// 🔴 修复后台管理：使用云端上传
const AdminPanel = ({ rules, onBack }: { rules: RecognitionRule[], onBack: () => void }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const defaultRule: Partial<RecognitionRule> = { targetType: 'image', feedback: [{ type: 'text', content: '' }], name: '', targetValue: '' };
  const [formRule, setFormRule] = useState<Partial<RecognitionRule>>(defaultRule);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<FeedbackType | null>(null);

  const startEdit = (rule: RecognitionRule) => {
    if (rule.id.startsWith('rule_')) { alert("这是【全局规则】，请通过修改 GitHub 源码来更新它。"); return; }
    setEditingId(rule.id);
    setFormRule(JSON.parse(JSON.stringify(rule)));
    setViewMode('form');
  };
  const startAdd = () => { setEditingId(null); setFormRule(JSON.parse(JSON.stringify(defaultRule))); setViewMode('form'); };
  
  const handleSave = async () => {
    if (!formRule.name) return alert("请填写名称");
    if (!formRule.targetValue) return alert("请填写目标描述");
    const validFeedback = formRule.feedback?.filter(f => f.content.trim() !== '') || [];
    if (validFeedback.length === 0) return alert("请至少设置一个反馈内容");
    
    // Bmob 不用传 ID，编辑时传 objectId
    const rule: RecognitionRule = { 
      id: editingId || '', 
      name: formRule.name, 
      targetType: formRule.targetType as TargetType, 
      targetValue: formRule.targetValue || '', 
      feedback: validFeedback, 
      createdAt: Date.now() 
    };
    
    await storageService.saveRule(rule);
    setTimeout(() => { setViewMode('list'); onBack(); }, 500);
  };
  
  const handleDelete = async (id: string) => { if (id.startsWith('rule_')) { alert("全局规则无法删除"); return; } if (confirm("确定要删除吗？")) { await storageService.deleteRule(id); onBack(); } };
  
  // 🔴 关键修改：调用云端上传
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; 
    if (file && activeUploadType) { 
      setUploadingMedia(true); 
      try { 
        // 使用新的 uploadFile 方法，获取 https 链接
        const url = await storageService.uploadFile(file); 
        
        const currentFeedback = formRule.feedback || []; 
        const exists = currentFeedback.find(f => f.type === activeUploadType); 
        let newFeedback; 
        if (exists) { 
          newFeedback = currentFeedback.map(f => f.type === activeUploadType ? { ...f, content: url } : f); 
        } else { 
          newFeedback = [...currentFeedback, { type: activeUploadType, content: url }]; 
        } 
        setFormRule({ ...formRule, feedback: newFeedback }); 
      } catch (err) { console.error(err); } 
      finally { setUploadingMedia(false); setActiveUploadType(null); } 
    } 
  };
  
  const triggerUpload = (type: FeedbackType) => { setActiveUploadType(type); setTimeout(() => mediaInputRef.current?.click(), 100); };
  const updateTextFeedback = (text: string) => { const currentFeedback = formRule.feedback || []; const exists = currentFeedback.find(f => f.type === 'text'); let newFeedback; if (exists) { newFeedback = currentFeedback.map(f => f.type === 'text' ? { ...f, content: text } : f); } else { newFeedback = [...currentFeedback, { type: 'text' as FeedbackType, content: text }]; } setFormRule({ ...formRule, feedback: newFeedback }); };
  const getTextContent = () => formRule.feedback?.find(f => f.type === 'text')?.content || '';
  const hasFeedback = (type: FeedbackType) => formRule.feedback?.some(f => f.type === type && f.content);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 sticky top-0 z-10 flex items-center gap-4 shadow-sm">
        <button onClick={() => viewMode === 'form' ? setViewMode('list') : onBack()}><ChevronLeft /></button>
        <h2 className="font-bold text-xl">{viewMode === 'form' ? (editingId ? '编辑规则' : '新增规则') : '后台管理'}</h2>
      </div>
      <div className="p-4 space-y-4">
        {viewMode === 'list' && (
           <>
             <div className="bg-blue-50 p-4 rounded-xl mb-2 text-sm text-blue-800 shadow-sm border border-blue-100"><p className="font-bold mb-1">📢 规则同步说明</p><p>新增的规则将保存到 <span className="font-bold">Bmob 云端</span>，所有用户都能同步看到！</p></div>
             <button onClick={startAdd} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 font-bold hover:bg-gray-100 transition-colors"><Plus /> 新增云端规则</button>
             {rules.map(rule => ( <div key={rule.id} className={`bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border ${rule.id.startsWith('rule_') ? 'border-purple-200 bg-purple-50/30' : 'border-gray-100'}`}> <div className="flex items-center gap-3 overflow-hidden"> <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${rule.targetType === 'ocr' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}> {rule.targetType === 'ocr' ? <Type size={20} /> : <ImageIcon size={20} />} </div> <div className="min-w-0"> <div className="font-bold truncate text-gray-800 flex items-center gap-2"> {rule.name} {rule.id.startsWith('rule_') && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 rounded border border-purple-200">全局</span>} </div> <div className="text-xs text-gray-400 truncate">目标: {rule.targetValue}</div> </div> </div> <div className="flex gap-1"> {!rule.id.startsWith('rule_') && ( <> <button onClick={() => startEdit(rule)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Edit2 className="w-5 h-5" /></button> <button onClick={() => handleDelete(rule.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button> </> )} </div> </div> ))}
           </>
        )}
        {viewMode === 'form' && (
           <div className="bg-white p-4 rounded-xl shadow border border-blue-200 space-y-6">
              <input type="file" accept="*/*" ref={mediaInputRef} className="hidden" onChange={handleMediaUpload} />
              <div><label className="text-xs text-gray-500 block mb-1 font-bold">1. 规则名称</label><input placeholder="例如：我的钥匙" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white transition-colors" value={formRule.name || ''} onChange={e => setFormRule({...formRule, name: e.target.value})} /></div>
              <div><label className="text-xs text-gray-500 block mb-2 font-bold">2. 识别类型</label><div className="flex gap-2 bg-gray-100 p-1 rounded-lg"><button onClick={() => setFormRule({...formRule, targetType: 'image'})} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${formRule.targetType === 'image' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><ImageIcon size={16} /> 物体/场景</button><button onClick={() => setFormRule({...formRule, targetType: 'ocr'})} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${formRule.targetType === 'ocr' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}><Type size={16} /> 包含文字</button></div></div>
              <div><label className="text-xs text-gray-500 block mb-1 font-bold">3. 目标描述</label><textarea placeholder={formRule.targetType === 'ocr' ? "例如：JAY (输入你要找的文字)" : "例如：一个红色的消防栓 (描述画面内容)"} className="w-full border p-3 rounded-lg bg-gray-50 min-h-[80px]" value={formRule.targetValue || ''} onChange={e => setFormRule({...formRule, targetValue: e.target.value})} /></div>
              <div><label className="text-xs text-gray-500 block mb-2 font-bold">4. 触发反馈 (可多选)</label><div className="space-y-3"><div className="border border-gray-200 rounded-xl p-3"><div className="flex items-center gap-2 mb-2 font-bold text-sm text-gray-700"><Type size={16} /> 文字消息</div><textarea placeholder="识别成功后显示的文字..." className="w-full border-b border-gray-100 p-2 text-sm focus:outline-none" value={getTextContent()} onChange={e => updateTextFeedback(e.target.value)} /></div><button onClick={() => triggerUpload('image')} className={`w-full py-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${hasFeedback('image') ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 text-gray-500'}`}><ImageIcon size={16} /> {hasFeedback('image') ? '图片已上传 (点击更换)' : '上传反馈图片'}</button><button onClick={() => triggerUpload('video')} className={`w-full py-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${hasFeedback('video') ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 text-gray-500'}`}><Video size={16} /> {hasFeedback('video') ? '视频已上传 (点击更换)' : '上传反馈视频'}</button><button onClick={() => triggerUpload('audio')} className={`w-full py-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${hasFeedback('audio') ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 text-gray-500'}`}><Music size={16} /> {hasFeedback('audio') ? '音频已上传 (点击更换)' : '上传反馈音频'}</button></div>{uploadingMedia && <p className="text-center text-xs text-blue-500 mt-2 animate-pulse">正在上传文件到云端，请稍候...</p>}</div>
              <div className="flex gap-2 pt-4 border-t"><button onClick={handleSave} disabled={uploadingMedia} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all">保存</button><button onClick={() => setViewMode('list')} className="flex-1 bg-gray-100 py-3 rounded-xl text-gray-600 font-bold">取消</button></div>
           </div>
        )}
      </div>
    </div>
  );
};
