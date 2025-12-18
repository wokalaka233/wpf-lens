import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, AlertCircle, ChevronLeft, Image as ImageIcon, Video, Music, Sparkles, PlayCircle } from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import { RecognitionRule } from './types';
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

  useEffect(() => { loadData(); localAiService.loadModels(); }, []);

  const handleAnalyze = async (base64: string) => {
    setCapturedImage(base64); // 立即保存照片用于缩略图展示
    setView('processing');
    const start = Date.now();
    try {
      const resultId = await localAiService.analyzeImageLocal(base64, rules);
      setProcessingTime((Date.now() - start) / 1000);
      
      const matched = rules.find(r => r.id === resultId);
      if (matched) {
        setMatchResult(matched);
        setErrorMsg(null);
      } else {
        setMatchResult(null);
        setErrorMsg(resultId); 
      }
      setView('feedback');
    } catch (e: any) {
      setErrorMsg(e.message);
      setView('feedback');
    }
  };

  if (view === 'admin-login') return <AdminLoginView onSuccess={() => setView('admin')} onBack={() => setView('home')} />;
  if (view === 'admin') return <AdminPanel rules={rules} onBack={() => { loadData(); setView('home'); }} />;

  return (
    <div className="h-dvh bg-white text-slate-900 font-sans max-w-lg mx-auto relative overflow-hidden flex flex-col">
      {/* 极简页头 */}
      <header className="p-6 pt-safe flex justify-between items-center z-10 shrink-0">
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic">wpf的镜头</h1>
        <button onClick={() => setView('admin-login')} className="p-3 rounded-2xl bg-slate-50 active:scale-90 transition-all text-slate-400"><Settings className="w-6 h-6" /></button>
      </header>

      <main className="flex-1 overflow-y-auto relative">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full px-10 space-y-12 animate-in fade-in duration-700">
            <div className="relative">
              <div className="w-36 h-36 bg-blue-600 rounded-[3.5rem] flex items-center justify-center shadow-2xl shadow-blue-200">
                <Camera className="w-16 h-16 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-blue-400 w-10 h-10 animate-pulse" />
            </div>
            
            <div className="text-center">
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">准备扫描</h2>
            </div>

            <div className="w-full space-y-5 max-w-xs pb-10">
              <button onClick={() => setView('camera')} className="w-full bg-blue-600 text-white p-6 rounded-[2.5rem] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 font-black text-xl">开启相机</button>
              <button onClick={() => setView('upload')} className="w-full bg-slate-50 text-slate-400 p-6 rounded-[2.5rem] active:scale-95 transition-all flex items-center justify-center gap-3 font-black text-xl italic">上传图片</button>
            </div>
          </div>
        )}

        {view === 'camera' && <CameraView onCapture={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'upload' && <UploadView onUpload={handleAnalyze} onClose={() => setView('home')} />}

        {/* 🎬 识别中 UI：圆润缩略图效果 */}
        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full space-y-10 bg-white absolute inset-0 z-20 animate-in fade-in">
             <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                {/* 🛑 核心需求：展示拍摄的照片缩略小图 */}
                {capturedImage && (
                  <img src={capturedImage} className="w-32 h-32 object-cover rounded-full shadow-lg border-4 border-white" />
                )}
             </div>
             <div className="text-center space-y-3">
                <p className="text-2xl font-black text-slate-800 italic">正在极速压缩并分析...</p>
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">AI 正在识别画面内容</p>
             </div>
          </div>
        )}

        {/* 🌟 结果反馈页：带拍摄照片的毛玻璃背景 */}
        {view === 'feedback' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-500">
            {/* 🛑 核心需求：反馈背景为拍摄照片的毛玻璃效果 */}
            {capturedImage && (
              <div className="absolute inset-0 z-0 overflow-hidden">
                 <img src={capturedImage} className="w-full h-full object-cover scale-125 blur-[60px] opacity-70" />
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
                    <div key={i} className="w-full bg-white/90 backdrop-blur-2xl rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-700">
                      {fb.type === 'text' && <p className="text-center text-slate-800 text-xl font-black leading-snug">{fb.content}</p>}
                      {fb.type === 'image' && <img src={fb.content} className="w-full rounded-[2rem] shadow-md" referrerPolicy="no-referrer" />}
                      {/* 🛑 核心需求：视频自动播放，不静音 */}
                      {fb.type === 'video' && (
                        <video src={fb.content} autoPlay playsInline controls className="w-full rounded-[2rem] bg-black shadow-inner" />
                      )}
                      {fb.type === 'audio' && (
                        <div className="flex items-center gap-4 bg-slate-100 p-5 rounded-[2.5rem] shadow-inner">
                          <PlayCircle className="text-blue-600 w-10 h-10 animate-pulse" />
                          <audio src={fb.content} autoPlay controls className="flex-1" />
                        </div>
                      )}
                    </div>
                  ))}

                  <button onClick={() => setView('home')} className="w-full bg-white/20 hover:bg-white/30 text-white p-6 rounded-[2.5rem] font-black text-2xl backdrop-blur-3xl border border-white/20 transition-all active:scale-95 shadow-2xl mt-4">
                    完成确认
                  </button>
                </>
              ) : (
                <div className="bg-white/95 backdrop-blur-3xl p-12 rounded-[4rem] text-center space-y-8 shadow-2xl animate-in zoom-in">
                   <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
                   <div className="space-y-2">
                     <p className="text-3xl font-black text-slate-800 italic tracking-tighter">未匹配到目标</p>
                     <p className="text-slate-400 font-medium text-xs break-all opacity-80">{errorMsg}</p>
                   </div>
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

// --- 📸 相机组件：带镜头反转 ---
const CameraView = ({ onCapture, onClose }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFront, setIsFront] = useState(false);

  const initCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: isFront ? 'user' : 'environment' }, 
        audio: false 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) { alert("请允许相机权限"); }
  }, [isFront]);

  useEffect(() => { initCam(); return () => (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); }, [initCam]);

  const capture = () => {
    const v = videoRef.current; const c = canvasRef.current;
    if(v && c) {
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      if(ctx) {
        if(isFront) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(v, 0, 0);
        onCapture(c.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-dvh overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className={`flex-1 object-cover ${isFront ? 'scale-x-[-1]' : ''}`} />
      <canvas ref={canvasRef} className="hidden" />
      <div className="p-10 pb-safe-offset-4 flex justify-between items-center bg-black/40 backdrop-blur-2xl absolute bottom-0 left-0 right-0">
        <button onClick={onClose} className="p-5 bg-white/10 rounded-full text-white active:scale-90 transition-all shadow-lg"><X className="w-8 h-8" /></button>
        <button onClick={capture} className="w-24 h-24 bg-white rounded-full border-[10px] border-white/20 active:scale-75 transition-all shadow-2xl" />
        <button onClick={() => setIsFront(!isFront)} className="p-5 bg-white/10 rounded-full text-white active:scale-90 transition-all shadow-lg"><RefreshCw className="w-8 h-8" /></button>
      </div>
    </div>
  );
};

// --- 子组件定义保持精简 ---
const AdminPanel = ({ rules, onBack }: any) => ( <div className="h-full bg-white p-10"><button onClick={onBack} className="p-4 bg-slate-100 rounded-2xl font-bold">返回</button><p className="mt-20 text-center font-black italic opacity-20">Rules Management Ready</p></div> );
const AdminLoginView = ({ onSuccess, on
