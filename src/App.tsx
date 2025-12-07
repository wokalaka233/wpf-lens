import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, Play, Pause, AlertCircle, CheckCircle2, ChevronLeft, Image as ImageIcon, Type, ScanLine, Video, FileVideo, Mic, Music, Lock, Unlock, Edit2 } from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import * as mediaStore from './services/mediaStore';
import { RecognitionRule, FeedbackConfig, TargetType, FeedbackType } from './types';

// Initialize data
storageService.seedInitialData();

type ViewState = 'home' | 'camera' | 'upload' | 'processing' | 'feedback' | 'admin-login' | 'admin';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [rules, setRules] = useState<RecognitionRule[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<RecognitionRule | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(false);

  // Load data on mount and preload models
  useEffect(() => {
    setRules(storageService.getRules());
    
    const initModels = async () => {
      setIsModelLoading(true);
      try {
        await localAiService.loadModels();
      } catch (e) {
        console.error("Model load failed", e);
      } finally {
        setIsModelLoading(false);
      }
    };
    initModels();
  }, []);

  const handleAnalyze = async (base64Img: string) => {
    setCapturedImage(base64Img);
    setView('processing');
    setErrorMsg(null);
    setMatchResult(null);
    const startTime = Date.now();

    try {
      // Use Local AI Service
      const matchedId = await localAiService.analyzeImageLocal(base64Img, rules);
      const endTime = Date.now();
      setProcessingTime((endTime - startTime) / 1000);

      storageService.saveLog({
        id: Date.now().toString(),
        timestamp: Date.now(),
        matchedRuleId: matchedId,
        success: !!matchedId
      });

      if (matchedId) {
        const rule = rules.find(r => r.id === matchedId);
        if (rule) {
          setMatchResult(rule);
          setView('feedback');
          return;
        }
      }
      setErrorMsg("未找到匹配項");
      setView('feedback'); 
    } catch (err: any) {
      setErrorMsg("分析失敗");
      console.error(err);
      setView('feedback');
    }
  };

  if (view === 'admin-login') {
    return <AdminLoginView onSuccess={() => setView('admin')} onBack={() => setView('home')} />;
  }

  if (view === 'admin') {
    return (
      <AdminPanel 
        rules={rules} 
        onBack={() => {
          setRules(storageService.getRules());
          setView('home');
        }} 
      />
    );
  }

  return (
    <div className="h-dvh bg-gray-50 text-gray-900 font-sans max-w-lg mx-auto shadow-2xl relative overflow-hidden flex flex-col">
      
      <header className="bg-white p-4 pt-safe shadow-sm flex justify-between items-center z-10 shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          wpf的镜头
        </h1>
        <button 
          onClick={() => setView('admin-login')} 
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <Settings className="w-6 h-6 text-gray-600" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full px-6 space-y-8 animate-fade-in pb-safe">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-gray-800 text-2xl font-bold">準備掃描</p>
            </div>
            
            {isModelLoading ? (
              <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm">
                <div className="w-6 h-6 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <span className="text-sm text-gray-500">正在加載 AI 模型...</span>
              </div>
            ) : (
              <div className="w-full space-y-4 max-w-xs">
                <button 
                  onClick={() => setView('camera')}
                  className="w-full bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 font-semibold text-lg"
                >
                  <Camera className="w-6 h-6" />
                  開啟相機
                </button>

                <button 
                  onClick={() => setView('upload')}
                  className="w-full bg-white border border-gray-200 text-gray-700 p-4 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 font-semibold text-lg"
                >
                  <Upload className="w-6 h-6" />
                  上傳圖片
                </button>
              </div>
            )}
            
            {rules.length === 0 && (
               <div className="bg-orange-50 text-orange-700 text-xs p-3 rounded-lg flex items-center gap-2 max-w-xs">
                 <AlertCircle className="w-4 h-4 shrink-0" />
                 <span>尚未配置規則。</span>
               </div>
            )}
          </div>
        )}

        {view === 'camera' && (
          <CameraView 
            onCapture={handleAnalyze} 
            onClose={() => setView('home')} 
          />
        )}

        {view === 'upload' && (
          <UploadView 
            onUpload={handleAnalyze} 
            onClose={() => setView('home')} 
          />
        )}

        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 bg-white absolute inset-0 z-20">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-100 rounded-full"></div>
              <div className="w-24 h-24 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-gray-800 animate-pulse">正在分析...</p>
              <p className="text-sm text-gray-500">識別文字與物體特徵</p>
            </div>
            {capturedImage && (
               <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-inner border border-gray-100 relative">
                  <img src={capturedImage} alt="Scanning" className="w-full h-full object-cover opacity-60 blur-sm" />
               </div>
            )}
          </div>
        )}

        {view === 'feedback' && (
          <FeedbackView 
            result={matchResult} 
            error={errorMsg}
            capturedImage={capturedImage}
            processingTime={processingTime}
            onClose={() => setView('home')} 
          />
        )}
      </main>
    </div>
  );
}

// --- Sub-Components ---

const AdminLoginView = ({ onSuccess, onBack }: { onSuccess: () => void, onBack: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '11335510') {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="h-dvh bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-blue-50 p-4 rounded-full mb-6">
        <Lock className="w-8 h-8 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold mb-2">管理員登入</h2>
      <p className="text-gray-500 mb-8 text-sm">請輸入後台管理密碼</p>
      
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input 
          type="password" 
          pattern="[0-9]*" 
          inputMode="numeric"
          placeholder="輸入密碼"
          className={`w-full text-center text-xl tracking-widest p-4 rounded-xl border-2 outline-none transition-all ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500'}`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="text-red-500 text-sm animate-pulse">密碼錯誤</p>}
        
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
        >
          進入後台
        </button>
      </form>
      
      <button onClick={onBack} className="mt-8 text-gray-400 text-sm">取消返回</button>
    </div>
  );
};

const CameraView = ({ onCapture, onClose }: { onCapture: (img: string) => void, onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFront, setIsFront] = useState(false);
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: { facingMode: isFront ? 'user' : 'environment' },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setError('');
    } catch (err: any) {
      setError("無法訪問相機");
    }
  }, [isFront]);

  useEffect(() => {
    startCamera();
    return () => {
       if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isFront) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        onCapture(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-dvh">
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
         {error ? <div className="text-white">{error}</div> : <video ref={videoRef} autoPlay playsInline muted className={`absolute w-full h-full object-cover ${isFront ? 'scale-x-[-1]' : ''}`} />}
         <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="bg-black/80 p-6 pb-safe flex justify-between items-center">
         <button onClick={onClose} className="p-4 text-white rounded-full bg-white/10"><X /></button>
         <button onClick={takePhoto} disabled={!!error} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300" />
         <button onClick={() => setIsFront(!isFront)} className="p-4 text-white rounded-full bg-white/10"><RefreshCw /></button>
      </div>
    </div>
  );
};

const UploadView = ({ onUpload, onClose }: { onUpload: (img: string) => void, onClose: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => ev.target?.result && onUpload(ev.target.result as string);
      reader.readAsDataURL(file);
    }
  };
  useEffect(() => { fileInputRef.current?.click(); }, []);
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6">
       <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFile} className="hidden" />
       <h2 className="text-xl font-bold mb-4">選擇圖片</h2>
       <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-lg mb-4">打開相簿</button>
       <button onClick={onClose} className="text-gray-500">取消</button>
    </div>
  );
};

const FeedbackView = ({ result, error, capturedImage, processingTime, onClose }: { result: RecognitionRule | null, error: string | null, capturedImage: string | null, processingTime: number, onClose: () => void }) => {
  const [localMediaSrcs, setLocalMediaSrcs] = useState<Record<string, string>>({});
  const videoRefs = useRef<HTMLVideoElement[]>([]);
  const audioRefs = useRef<HTMLAudioElement[]>([]);

  // Load all media resources
  useEffect(() => {
    const urls: string[] = [];
    
    const loadAllMedia = async () => {
      if (!result) return;
      
      const newSrcs: Record<string, string> = {};
      
      for (const fb of result.feedback) {
         if (['video', 'audio', 'image'].includes(fb.type) && fb.content) {
            if (fb.content.startsWith('local::')) {
               const mediaId = fb.content.replace('local::', '');
               try {
                  const blob = await mediaStore.getMedia(mediaId);
                  if (blob) {
                     const url = URL.createObjectURL(blob);
                     newSrcs[fb.content] = url;
                     urls.push(url);
                  }
               } catch(e) { console.error(e); }
            } else {
               newSrcs[fb.content] = fb.content;
            }
         }
      }
      setLocalMediaSrcs(newSrcs);
    };

    loadAllMedia();

    return () => {
       urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [result]);

  // Autoplay Effect
  useEffect(() => {
    if (result) {
       setTimeout(() => {
          videoRefs.current.forEach(v => v?.play().catch(e => console.log("Video autoplay prevented", e)));
          audioRefs.current.forEach(a => a?.play().catch(e => console.log("Audio autoplay prevented", e)));
       }, 600);
    }
  }, [result, localMediaSrcs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center h-dvh overflow-hidden bg-black">
      {/* Background Layer */}
      {capturedImage && (
        <div className="absolute inset-0 z-0">
          <img 
            src={capturedImage} 
            className="w-full h-full object-cover animate-blur-in" 
            alt="Background" 
          />
          <div className="absolute inset-0 bg-black/50 animate-fade-in"></div>
        </div>
      )}
      
      <div className="absolute inset-0 z-10 bg-white animate-flash pointer-events-none"></div>

      <div className="z-20 w-full max-w-md p-4 flex flex-col items-center animate-pop-out max-h-screen overflow-y-auto no-scrollbar">
        
        {error ? (
          <div className="bg-white rounded-3xl p-6 w-full text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold mb-2">未匹配</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button onClick={onClose} className="w-full bg-gray-900 text-white py-3 rounded-xl">返回</button>
          </div>
        ) : result ? (
          <div className="w-full space-y-4 pb-10">
            <div className="text-center text-white mb-2 shadow-sm">
               <h2 className="text-3xl font-bold drop-shadow-md">{result.name}</h2>
               <p className="text-white/60 text-xs mt-1">匹配成功 · 耗時 {processingTime.toFixed(2)}s</p>
            </div>

            {/* Iterate through all feedbacks */}
            {result.feedback.map((fb, idx) => {
               const src = localMediaSrcs[fb.content] || (fb.content.startsWith('local::') ? null : fb.content);
               
               if (fb.type === 'text') {
                 return (
                   <div key={idx} className="bg-white/90 backdrop-blur-md rounded-2xl p-6 text-center shadow-xl border border-white/20">
                      <p className="text-gray-900 text-lg font-medium">{fb.content}</p>
                   </div>
                 );
               }

               if (fb.type === 'image' && src) {
                 return (
                   <div key={idx} className="bg-white p-2 rounded-2xl shadow-xl">
                      <img src={src} className="w-full h-auto rounded-xl max-h-60 object-contain mx-auto" alt="Feedback" />
                   </div>
                 );
               }

               if (fb.type === 'video' && src) {
                 return (
                    <div key={idx} className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
                      <video 
                        ref={el => { if(el) videoRefs.current[idx] = el }} 
                        src={src} 
                        className="w-full h-full object-contain" 
                        controls 
                        playsInline 
                      />
                    </div>
                 );
               }

               if (fb.type === 'audio' && src) {
                 return (
                   <div key={idx} className="bg-white/90 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 shadow-xl">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0 animate-pulse-fast">
                        <Music className="text-white w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <audio 
                           ref={el => { if(el) audioRefs.current[idx] = el }} 
                           src={src} 
                           controls 
                           className="w-full h-8" 
                         />
                      </div>
                   </div>
                 );
               }
               return null;
            })}

            <button onClick={onClose} className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white py-4 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95 shadow-lg mt-4">
              完成確認
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const AdminPanel = ({ rules, onBack }: { rules: RecognitionRule[], onBack: () => void }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Initialize with a default structure
  const defaultRule: Partial<RecognitionRule> = { 
    targetType: 'ocr', 
    feedback: [{ type: 'text', content: '' }],
    similarityThreshold: 0.85,
    name: '',
    targetValue: ''
  };

  const [formRule, setFormRule] = useState<Partial<RecognitionRule>>(defaultRule);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  
  const [processingRefImage, setProcessingRefImage] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  
  // Track which feedback is currently being edited for file upload
  const [activeFeedbackTypeForUpload, setActiveFeedbackTypeForUpload] = useState<FeedbackType | null>(null);

  const startEdit = (rule: RecognitionRule) => {
    setEditingId(rule.id);
    setFormRule(JSON.parse(JSON.stringify(rule))); // Deep copy
    setViewMode('form');
  };

  const startAdd = () => {
    setEditingId(null);
    setFormRule(JSON.parse(JSON.stringify(defaultRule)));
    setViewMode('form');
  };

  const handleSave = () => {
    if (!formRule.name) return alert("請填寫名稱");
    if (formRule.targetType !== 'similarity' && !formRule.targetValue) return alert("請填寫目標值");
    if (formRule.targetType === 'similarity' && !formRule.embedding) return alert("請上傳參考圖片");
    
    // Filter out empty feedbacks
    const validFeedback = formRule.feedback?.filter(f => f.content.trim() !== '') || [];
    if (validFeedback.length === 0) return alert("請至少設置一個有效的反饋內容");

    const rule: RecognitionRule = {
      id: editingId || Date.now().toString(),
      name: formRule.name,
      targetType: formRule.targetType as TargetType,
      targetValue: formRule.targetValue || 'image-ref',
      embedding: formRule.embedding,
      similarityThreshold: formRule.similarityThreshold || 0.8,
      feedback: validFeedback,
      createdAt: formRule.createdAt || Date.now()
    };
    storageService.saveRule(rule);
    setViewMode('list');
  };

  const handleDelete = (id: string) => {
    if (confirm("確定要刪除嗎？")) {
      storageService.deleteRule(id);
      onBack();
    }
  };

  // Helper to toggle feedback types
  const toggleFeedbackType = (type: FeedbackType) => {
    const currentFeedback = formRule.feedback || [];
    const exists = currentFeedback.find(f => f.type === type);
    
    if (exists) {
      // Remove
      setFormRule({ ...formRule, feedback: currentFeedback.filter(f => f.type !== type) });
    } else {
      // Add
      setFormRule({ ...formRule, feedback: [...currentFeedback, { type, content: '' }] });
    }
  };

  const updateFeedbackContent = (type: FeedbackType, content: string) => {
    const currentFeedback = formRule.feedback || [];
    setFormRule({
      ...formRule,
      feedback: currentFeedback.map(f => f.type === type ? { ...f, content } : f)
    });
  };

  // Process uploaded reference image for embedding
  const handleRefImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessingRefImage(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          const base64 = ev.target.result as string;
          const img = new Image();
          img.src = base64;
          await new Promise(r => img.onload = r);
          
          const embedding = await localAiService.extractEmbedding(img);
          if (embedding) {
            setFormRule({ ...formRule, embedding, targetValue: 'custom-image' });
          } else {
            alert("無法提取圖片特徵");
          }
          setProcessingRefImage(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Media Upload for Feedback
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // IMPORTANT: Check activeFeedbackTypeForUpload is not null
    if (file && activeFeedbackTypeForUpload) {
      setUploadingMedia(true);
      try {
        const id = await mediaStore.saveMedia(file);
        updateFeedbackContent(activeFeedbackTypeForUpload, `local::${id}`);
      } catch (err) {
        console.error(err);
        alert("文件保存失敗");
      } finally {
        setUploadingMedia(false);
        setActiveFeedbackTypeForUpload(null);
      }
    }
  };

  const triggerMediaUpload = (type: FeedbackType) => {
    setActiveFeedbackTypeForUpload(type);
    setTimeout(() => mediaInputRef.current?.click(), 100);
  };

  const getAcceptType = () => {
    switch(activeFeedbackTypeForUpload) {
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      case 'image': return 'image/*';
      default: return '*/*';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 sticky top-0 z-10 flex items-center gap-4 shadow-sm">
        <button onClick={() => viewMode === 'form' ? setViewMode('list') : onBack()}><ChevronLeft /></button>
        <h2 className="font-bold">{viewMode === 'form' ? (editingId ? '編輯規則' : '新增規則') : '管理後台'}</h2>
      </div>

      <div className="p-4 space-y-4">
        {viewMode === 'list' && (
           <>
             <button onClick={startAdd} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2">
               <Plus /> 新增規則
             </button>
             
             {rules.map(rule => (
                <div key={rule.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-gray-100">
                  <div className="flex items-center gap-3 overflow-hidden">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${rule.targetType === 'ocr' ? 'bg-purple-100 text-purple-600' : rule.targetType === 'image' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        {rule.targetType === 'ocr' && <Type size={20} />}
                        {rule.targetType === 'image' && <ImageIcon size={20} />}
                        {rule.targetType === 'similarity' && <ScanLine size={20} />}
                     </div>
                     <div className="min-w-0">
                        <div className="font-bold truncate text-gray-800">{rule.name}</div>
                        <div className="flex gap-1 mt-1">
                          {rule.feedback.map((f, i) => (
                             <span key={i} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 border border-gray-200">
                               {f.type === 'text' ? '文' : f.type === 'video' ? '影' : f.type === 'audio' ? '音' : '圖'}
                             </span>
                          ))}
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(rule)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(rule.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
           </>
        )}

        {viewMode === 'form' && (
           <div className="bg-white p-4 rounded-xl shadow border border-blue-200 space-y-6">
              
              {/* Name */}
              <div>
                <label className="text-xs text-gray-500 block mb-1 font-bold">1. 規則名稱</label>
                <input 
                  placeholder="例如：我的鑰匙" 
                  className="w-full border p-2 rounded" 
                  value={formRule.name || ''} 
                  onChange={e => setFormRule({...formRule, name: e.target.value})} 
                />
              </div>
              
              {/* Target Type */}
              <div>
                <label className="text-xs text-gray-500 block mb-2 font-bold">2. 識別目標類型</label>
                <div className="flex gap-2 bg-gray-50 p-1 rounded-lg">
                  <button onClick={() => setFormRule({...formRule, targetType: 'ocr'})} className={`flex-1 py-2 rounded text-sm flex items-center justify-center gap-1 ${formRule.targetType === 'ocr' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>
                    <Type size={16} /> 文字
                  </button>
                  <button onClick={() => setFormRule({...formRule, targetType: 'image'})} className={`flex-1 py-2 rounded text-sm flex items-center justify-center gap-1 ${formRule.targetType === 'image' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>
                    <ImageIcon size={16} /> 物體
                  </button>
                  <button onClick={() => setFormRule({...formRule, targetType: 'similarity'})} className={`flex-1 py-2 rounded text-sm flex items-center justify-center gap-1 ${formRule.targetType === 'similarity' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>
                    <ScanLine size={16} /> 比對
                  </button>
                </div>
              </div>

              {/* Specific Config based on Target Type */}
              <div className="bg-gray-50 p-3 rounded-lg">
                {formRule.targetType === 'ocr' && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">目標關鍵字</label>
                    <input 
                      placeholder="例如：SALE" 
                      className="w-full border p-2 rounded bg-white"
                      value={formRule.targetValue || ''}
                      onChange={e => setFormRule({...formRule, targetValue: e.target.value})}
                    />
                  </div>
                )}

                {formRule.targetType === 'image' && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">物體英文名稱</label>
                    <input 
                      placeholder="例如：cup, phone, laptop" 
                      className="w-full border p-2 rounded bg-white"
                      value={formRule.targetValue || ''}
                      onChange={e => setFormRule({...formRule, targetValue: e.target.value})}
                    />
                  </div>
                )}

                {formRule.targetType === 'similarity' && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 block mb-1">上傳參考圖片</label>
                    <input type="file" accept="image/*" ref={fileRef} onChange={handleRefImage} className="hidden" />
                    <button 
                      onClick={() => fileRef.current?.click()}
                      className={`w-full py-6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-white ${formRule.embedding ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                    >
                      {processingRefImage ? (
                        <span className="text-sm">正在提取特徵...</span>
                      ) : formRule.embedding ? (
                        <span className="text-green-600 font-bold flex items-center gap-2"><CheckCircle2 size={20}/> 圖片特徵已保存</span>
                      ) : (
                        <span className="text-gray-400 text-sm">點擊上傳被對比的圖片</span>
                      )}
                    </button>
                    
                    <label className="text-xs text-gray-500 block mt-2">相似度閾值 ({formRule.similarityThreshold})</label>
                    <input 
                      type="range" min="0.5" max="0.99" step="0.01" 
                      className="w-full"
                      value={formRule.similarityThreshold || 0.85}
                      onChange={e => setFormRule({...formRule, similarityThreshold: parseFloat(e.target.value)})}
                    />
                  </div>
                )}
              </div>

              {/* Feedback Section (Multi-select) */}
              <div>
                <label className="text-xs text-gray-500 block mb-2 font-bold">3. 觸發反饋設置 (可多選)</label>
                
                {/* Toggles */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                   {['text', 'image', 'video', 'audio'].map((type) => {
                      const isSelected = formRule.feedback?.some(f => f.type === type);
                      return (
                        <button 
                          key={type}
                          onClick={() => toggleFeedbackType(type as FeedbackType)}
                          className={`py-3 text-xs border rounded-lg flex flex-col items-center gap-1 transition-all ${isSelected ? 'bg-gray-800 text-white border-gray-800 shadow-md transform scale-105' : 'bg-white text-gray-400 border-gray-200'}`}
                        >
                          {type === 'text' && <Type size={16}/>}
                          {type === 'image' && <ImageIcon size={16}/>}
                          {type === 'video' && <Video size={16}/>}
                          {type === 'audio' && <Music size={16}/>}
                          {type === 'text' ? '文字' : type === 'image' ? '圖片' : type === 'video' ? '影片' : '音樂'}
                        </button>
                      );
                   })}
                </div>

                {/* Inputs for Selected Feedbacks */}
                <div className="space-y-4">
                   <input 
                      type="file" 
                      accept={getAcceptType()} 
                      ref={mediaInputRef} 
                      className="hidden" 
                      onChange={handleMediaUpload}
                   />

                   {formRule.feedback?.map((fb) => (
                      <div key={fb.type} className="animate-fade-in">
                        <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-2">
                           {fb.type === 'text' && <Type size={12}/>}
                           {fb.type === 'image' && <ImageIcon size={12}/>}
                           {fb.type === 'video' && <Video size={12}/>}
                           {fb.type === 'audio' && <Music size={12}/>}
                           設置 {fb.type === 'text' ? '文字' : fb.type === 'image' ? '圖片' : fb.type === 'video' ? '影片' : '音頻'} 内容
                        </label>
                        
                        {fb.type === 'text' ? (
                           <textarea 
                             placeholder="輸入顯示的文字訊息..." 
                             className="w-full border p-3 rounded-xl min-h-[80px]"
                             value={fb.content}
                             onChange={e => updateFeedbackContent('text', e.target.value)}
                           />
                        ) : (
                           <button 
                             onClick={() => triggerMediaUpload(fb.type)}
                             className={`w-full py-4 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 ${fb.content?.startsWith('local::') ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}
                           >
                              {uploadingMedia && activeFeedbackTypeForUpload === fb.type ? (
                                <span className="text-sm">正在上傳...</span>
                              ) : fb.content?.startsWith('local::') ? (
                                <span className="text-green-600 font-bold flex items-center gap-2">
                                  <CheckCircle2 size={16}/> 已保存 (點擊更換)
                                </span>
                              ) : (
                                <span className="text-gray-500 text-sm flex items-center gap-2"><Upload size={16}/> 上傳文件</span>
                              )}
                           </button>
                        )}
                      </div>
                   ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button onClick={handleSave} disabled={processingRefImage || uploadingMedia} className="flex-1 bg-green-600 text-white py-3 rounded-xl disabled:opacity-50 font-bold">
                   {editingId ? '保存修改' : '創建規則'}
                </button>
                <button onClick={() => setViewMode('list')} className="flex-1 bg-gray-100 py-3 rounded-xl text-gray-600 font-bold">取消</button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
