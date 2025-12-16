import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Settings, X, RefreshCw, Trash2, Plus, AlertCircle, CheckCircle2, ChevronLeft, Image as ImageIcon, Type, Video, Music, Lock, Edit2, Loader2 } from 'lucide-react';
import * as storageService from './services/storageService';
import * as localAiService from './services/geminiService';
import * as mediaStore from './services/mediaStore';
import { RecognitionRule, FeedbackType, TargetType } from './types';
import { GLOBAL_RULES } from './defaultRules';

// 初始化 (通常建议放在 useEffect 中或者保证只执行一次)
// storageService.seedInitialData(); // 建议在 storageService 内部做单例判断

type ViewState = 'home' | 'camera' | 'upload' | 'processing' | 'feedback' | 'admin-login' | 'admin';

// 🔧 工具函数：图片压缩 (保持不变)
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
  const [isLoadingRules, setIsLoadingRules] = useState(true); // 新增：规则加载状态

  // 🔄 优化：核心逻辑只在组件挂载时执行一次，或者手动刷新
  const fetchRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const cloudRules = await storageService.getRules();
      // 合并逻辑：优先显示云端规则，ID 冲突时以云端为准
      const allRules = [...GLOBAL_RULES, ...cloudRules.filter(cr => !GLOBAL_RULES.find(gr => gr.id === cr.id))];
      setRules(allRules);
    } catch (error) {
      console.error("加载规则失败:", error);
      // 失败时至少保底显示全局规则
      setRules(GLOBAL_RULES);
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    localAiService.loadModels(); // 预加载模型
  }, [fetchRules]);

  const handleAnalyze = async (originalBase64: string) => {
    setView('processing');
    setErrorMsg(null);
    setMatchResult(null);
    const startTime = Date.now();

    try {
      const compressedImg = await compressImage(originalBase64);
      setCapturedImage(compressedImg);

      const matchedId = await localAiService.analyzeImageLocal(compressedImg, rules);
      const endTime = Date.now();
      setProcessingTime((endTime - startTime) / 1000);

      if (matchedId) {
        const rule = rules.find(r => r.id === matchedId);
        if (rule) {
          setMatchResult(rule);
          setView('feedback');
          return;
        }
      }
      setErrorMsg("未找到匹配的目标");
      setView('feedback'); 
    } catch (err: any) {
      setErrorMsg("分析出错，请检查网络或配置");
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
          fetchRules(); // 从后台返回时，刷新数据
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
        <button onClick={() => setView('admin-login')} className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200">
          <Settings className="w-6 h-6 text-gray-600" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center h-full px-6 space-y-8 animate-fade-in pb-safe">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                <Camera className="w-12 h-12 text-blue-600" />
              </div>
              <p className="text-gray-800 text-2xl font-bold">准备扫描</p>
              <p className="text-gray-500 text-sm">AI 视觉识别系统 Ready</p>
            </div>
            
            <div className="w-full space-y-4 max-w-xs">
              <button 
                onClick={() => setView('camera')} 
                disabled={isLoadingRules}
                className="w-full bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg disabled:opacity-50 disabled:scale-100"
              >
                <Camera className="w-6 h-6" /> 开启相机
              </button>
              <button 
                onClick={() => setView('upload')} 
                disabled={isLoadingRules}
                className="w-full bg-white border border-gray-200 text-gray-700 p-4 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg disabled:opacity-50"
              >
                <Upload className="w-6 h-6" /> 上传图片
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-8 bg-gray-100 px-4 py-2 rounded-full">
              {isLoadingRules ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> 正在从云端同步规则...</>
              ) : (
                <>已加载 {rules.length} 条识别规则</>
              )}
            </div>
          </div>
        )}

        {view === 'camera' && <CameraView onCapture={handleAnalyze} onClose={() => setView('home')} />}
        {view === 'upload' && <UploadView onUpload={handleAnalyze} onClose={() => setView('home')} />}

        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 bg-white absolute inset-0 z-20">
            {/* Loading 动画保持不变 */}
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-100 rounded-full"></div>
              <div className="w-24 h-24 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-gray-800 animate-pulse">正在极速压缩并分析...</p>
              <p className="text-sm text-gray-500">AI 正在识别画面内容</p>
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

// --- 子组件优化 ---

// 1. CameraView: 增加 playsInline 确保 iOS 兼容性
const CameraView = ({ onCapture, onClose }: { onCapture: (img: string) => void, onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFront, setIsFront] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: isFront ? 'user' : 'environment',
          width: { ideal: 1920 }, // 尝试获取高清流
          height: { ideal: 1080 }
        }, 
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // 确保视频已经加载元数据后再播放，防止黑屏
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (err) { 
      console.error(err);
      alert("无法访问相机，请检查权限或使用 HTTPS"); 
    }
  }, [isFront]);

  useEffect(() => {
    startCamera();
    return () => {
       const stream = videoRef.current?.srcObject as MediaStream;
       stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // 确保画布尺寸与视频实际尺寸一致
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isFront) { 
          ctx.translate(canvas.width, 0); 
          ctx.scale(-1, 1); 
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        onCapture(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-dvh">
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
         {/* 添加 playsInline 和 webkit-playsinline */}
         <video 
           ref={videoRef} 
           autoPlay 
           playsInline 
           webkit-playsinline="true"
           muted 
           className={`absolute w-full h-full object-cover ${isFront ? 'scale-x-[-1]' : ''}`} 
         />
         <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="bg-black/80 p-6 pb-safe flex justify-between items-center z-10">
         <button onClick={onClose} className="p-4 text-white rounded-full bg-white/10 hover:bg-white/20"><X /></button>
         <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 active:scale-90 transition-transform" />
         <button onClick={() => setIsFront(!isFront)} className="p-4 text-white rounded-full bg-white/10 hover:bg-white/20"><RefreshCw /></button>
      </div>
    </div>
  );
};

// 2. FeedbackView: 修复 URL.createObjectURL 内存泄漏
const FeedbackView = ({ result, error, capturedImage, processingTime, onClose }: { result: RecognitionRule | null, error: string | null, capturedImage: string | null, processingTime: number, onClose: () => void }) => {
  const [localMediaSrcs, setLocalMediaSrcs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!result) return;
    let isActive = true; // 防止组件卸载后设置状态
    const createdUrls: string[] = []; // 追踪创建的 URL

    const loadMedia = async () => {
      const newSrcs: Record<string, string> = {};
      for (const fb of result.feedback) {
         if (fb.content.startsWith('local::')) {
            try {
               const blob = await mediaStore.getMedia(fb.content.replace('local::', ''));
               if (blob && isActive) {
                 const url = URL.createObjectURL(blob);
                 newSrcs[fb.content] = url;
                 createdUrls.push(url);
               }
            } catch(e) {
              console.error("加载媒体失败", e);
            }
         }
      }
      if (isActive) setLocalMediaSrcs(newSrcs);
    };
    
    loadMedia();

    // 清理函数：释放内存
    return () => {
      isActive = false;
      createdUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [result]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center h-dvh bg-black">
      {capturedImage && <div className="absolute inset-0 z-0 opacity-50"><img src={capturedImage} className="w-full h-full object-cover blur-md" alt="bg" /></div>}
      <div className="z-20 w-full max-w-md p-4 flex flex-col items-center animate-pop-out max-h-screen overflow-y-auto">
        {error ? (
          <div className="bg-white rounded-3xl p-6 w-full text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold mb-2">未识别到目标</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button onClick={onClose} className="w-full bg-gray-900 text-white py-3 rounded-xl">返回重试</button>
          </div>
        ) : result ? (
          <div className="w-full space-y-4 pb-10">
            <div className="text-center text-white mb-2 shadow-sm">
               <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-full mb-2 shadow-lg">
                 <CheckCircle2 className="text-white w-8 h-8" />
               </div>
               <h2 className="text-3xl font-bold drop-shadow-md">{result.name}</h2>
               <p className="text-white/80 text-xs mt-1">AI 耗时 {processingTime.toFixed(2)}s</p>
            </div>
            {result.feedback.map((fb, idx) => {
               const src = localMediaSrcs[fb.content] || (fb.content.startsWith('local::') ? null : fb.content);
               return (
                 <div key={idx} className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/20">
                    {fb.type === 'text' && <p className="text-lg font-medium text-center text-gray-800">{fb.content}</p>}
                    {fb.type === 'image' && src && <img src={src} className="w-full rounded-xl max-h-60 object-contain bg-black/5" alt="feedback" />}
                    {fb.type === 'video' && src && <video src={src} controls className="w-full rounded-xl bg-black" playsInline webkit-playsinline="true" autoPlay />}
                    {fb.type === 'audio' && src && <audio src={src} controls className="w-full" autoPlay />}
                 </div>
               );
            })}
            <button onClick={onClose} className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold mt-4 shadow-lg hover:bg-gray-100 transition-colors">完成确认</button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// AdminLoginView, UploadView, AdminPanel 保持原样即可，逻辑基本没问题。
// 注意：AdminPanel 里的 onBack 调用在 App 组件中被修改为会触发 fetchRules()，
// 这样在后台添加完规则后，返回主页就能立即看到新规则。

const AdminLoginView = ({ onSuccess, onBack }: { onSuccess: () => void, onBack: () => void }) => {
    // ... 代码不变 (建议实际项目中不要在前端硬编码密码 '11335510')
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (password === '11335510') onSuccess();
      else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    };
  
    return (
      <div className="h-dvh bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-blue-50 p-4 rounded-full mb-6"><Lock className="w-8 h-8 text-blue-600" /></div>
        <h2 className="text-2xl font-bold mb-2">管理员登录</h2>
        <p className="text-gray-500 mb-8 text-sm">请输入后台管理密码</p>
        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
          <input 
            type="password" pattern="[0-9]*" inputMode="numeric" placeholder="输入密码"
            className={`w-full text-center text-xl tracking-widest p-4 rounded-xl border-2 outline-none transition-all ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500'}`}
            value={password} onChange={(e) => setPassword(e.target.value)} autoFocus
          />
          {error && <p className="text-red-500 text-sm animate-pulse">密码错误</p>}
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all">进入后台</button>
        </form>
        <button onClick={onBack} className="mt-8 text-gray-400 text-sm">取消返回</button>
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
         <h2 className="text-xl font-bold mb-4">选择图片</h2>
         <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-lg mb-4">打开相册</button>
         <button onClick={onClose} className="text-gray-500">取消</button>
      </div>
    );
  };

  // AdminPanel 需要保持原有逻辑
  const AdminPanel = ({ rules, onBack }: { rules: RecognitionRule[], onBack: () => void }) => {
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const defaultRule: Partial<RecognitionRule> = { 
      targetType: 'image', 
      feedback: [{ type: 'text', content: '' }],
      name: '',
      targetValue: ''
    };
    const [formRule, setFormRule] = useState<Partial<RecognitionRule>>(defaultRule);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadType, setActiveUploadType] = useState<FeedbackType | null>(null);
  
    const startEdit = (rule: RecognitionRule) => {
      if (rule.id.startsWith('rule_')) {
        alert("这是【全局规则】，请通过修改 GitHub 源码来更新它。");
        return;
      }
      setEditingId(rule.id);
      setFormRule(JSON.parse(JSON.stringify(rule)));
      setViewMode('form');
    };
  
    const startAdd = () => {
      setEditingId(null);
      setFormRule(JSON.parse(JSON.stringify(defaultRule)));
      setViewMode('form');
    };
  
    const handleSave = async () => {
      if (!formRule.name) return alert("请填写名称");
      if (!formRule.targetValue) return alert("请填写目标描述");
      
      const validFeedback = formRule.feedback?.filter(f => f.content.trim() !== '') || [];
      if (validFeedback.length === 0) return alert("请至少设置一个反馈内容");
  
      const rule: RecognitionRule = {
        // Bmob 新增时 ID 留空，编辑时用现有 ID
        id: editingId || '', 
        name: formRule.name,
        targetType: formRule.targetType as TargetType,
        targetValue: formRule.targetValue || '',
        feedback: validFeedback,
        createdAt: Date.now()
      };
      
      await storageService.saveRule(rule);
      
      setTimeout(() => {
         setViewMode('list');
         onBack(); // 触发刷新
      }, 500);
    };
  
    const handleDelete = async (id: string) => {
      if (id.startsWith('rule_')) {
        alert("全局规则无法删除");
        return;
      }
      if (confirm("确定要删除吗？")) {
        await storageService.deleteRule(id);
        onBack();
      }
    };
  
    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeUploadType) {
        setUploadingMedia(true);
        try {
          const id = await mediaStore.saveMedia(file);
          const currentFeedback = formRule.feedback || [];
          const exists = currentFeedback.find(f => f.type === activeUploadType);
          let newFeedback;
          if (exists) {
            newFeedback = currentFeedback.map(f => f.type === activeUploadType ? { ...f, content: `local::${id}` } : f);
          } else {
            newFeedback = [...currentFeedback, { type: activeUploadType, content: `local::${id}` }];
          }
          setFormRule({ ...formRule, feedback: newFeedback });
        } catch (err) { alert("文件保存失败"); } 
        finally { 
          setUploadingMedia(false); 
          setActiveUploadType(null);
        }
      }
    };
  
    const triggerUpload = (type: FeedbackType) => {
      setActiveUploadType(type);
      setTimeout(() => mediaInputRef.current?.click(), 100);
    };
  
    const updateTextFeedback = (text: string) => {
      const currentFeedback = formRule.feedback || [];
      const exists = currentFeedback.find(f => f.type === 'text');
      let newFeedback;
      if (exists) {
        newFeedback = currentFeedback.map(f => f.type === 'text' ? { ...f, content: text } : f);
      } else {
        newFeedback = [...currentFeedback, { type: 'text' as FeedbackType, content: text }];
      }
      setFormRule({ ...formRule, feedback: newFeedback });
    };
  
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
               <div className="bg-blue-50 p-4 rounded-xl mb-2 text-sm text-blue-800 shadow-sm border border-blue-100">
                  <p className="font-bold mb-1">📢 云端同步说明</p>
                  <p>在此处新增的规则将保存到 <span className="font-bold">Bmob 云端</span>，所有用户都能同步看到！</p>
               </div>
  
               <button onClick={startAdd} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 font-bold hover:bg-gray-100 transition-colors">
                 <Plus /> 新增云端规则
               </button>
               
               {rules.map(rule => (
                  <div key={rule.id} className={`bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border ${rule.id.startsWith('rule_') ? 'border-purple-200 bg-purple-50/30' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${rule.targetType === 'ocr' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {rule.targetType === 'ocr' ? <Type size={20} /> : <ImageIcon size={20} />}
                       </div>
                       <div className="min-w-0">
                          <div className="font-bold truncate text-gray-800 flex items-center gap-2">
                            {rule.name}
                            {rule.id.startsWith('rule_') && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 rounded border border-purple-200">全局</span>}
                          </div>
                          <div className="text-xs text-gray-400 truncate">目标: {rule.targetValue}</div>
                       </div>
                    </div>
                    <div className="flex gap-1">
                      {!rule.id.startsWith('rule_') && (
                        <>
                          <button onClick={() => startEdit(rule)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Edit2 className="w-5 h-5" /></button>
                          <button onClick={() => handleDelete(rule.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
             </>
          )}
  
          {viewMode === 'form' && (
             <div className="bg-white p-4 rounded-xl shadow border border-blue-200 space-y-6">
                <input type="file" accept="*/*" ref={mediaInputRef} className="hidden" onChange={handleMediaUpload} />
                
                <div>
                  <label className="text-xs text-gray-500 block mb-1 font-bold">1. 规则名称</label>
                  <input placeholder="例如：我的钥匙" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white transition-colors" value={formRule.name || ''} onChange={e => setFormRule({...formRule, name: e.target.value})} />
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 block mb-2 font-bold">2. 识别类型</label>
                  <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setFormRule({...formRule, targetType: 'image'})} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${formRule.targetType === 'image' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                      <ImageIcon size={16} /> 物体/场景
                    </button>
                    <button onClick={() => setFormRule({...formRule, targetType: 'ocr'})} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${formRule.targetType === 'ocr' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>
                      <Type size={16} /> 包含文字
                    </button>
                  </div>
                </div>
  
                <div>
                  <label className="text-xs text-gray-500 block mb-1 font-bold">3. 目标描述</label>
                  <textarea 
                    placeholder={formRule.targetType === 'ocr' ? "例如：JAY (输入你要找的文字)" : "例如：一个红色的消防栓 (描述画面内容)"}
                    className="w-full border p-3 rounded-lg bg-gray-50 min-h-[80px]"
                    value={formRule.targetValue || ''}
                    onChange={e => setFormRule({...formRule, targetValue: e.target.value})}
                  />
                </div>
  
                <div>
                  <label className="text-xs text-gray-500 block mb-2 font-bold">4. 触发反馈 (可多选)</label>
                  <div className="space-y-3">
                     {/* 文字反馈 */}
                     <div className="border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2 font-bold text-sm text-gray-700">
                          <Type size={16} /> 文字消息
                        </div>
                        <textarea placeholder="识别成功后显示的文字..." className="w-full border-b border-gray-100 p-2 text-sm focus:outline-none" value={getTextContent()} onChange={e => updateTextFeedback(e.target.value)} />
                     </div>
  
                     {/* 图片反馈 */}
                     <button onClick={() => triggerUpload('image')} className={`w-full py-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${hasFeedback('image') ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 text-gray-500'}`}>
                        <ImageIcon size={16} /> {hasFeedback('image') ? '图片已上传 (点击更换)' : '上传反馈图片'}
                     </button>
  
                     {/* 视频反馈 */}
                     <button onClick={() => triggerUpload('video')} className={`w-full py-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${hasFeedback('video') ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 text-gray-500'}`}>
                        <Video size={16} /> {hasFeedback('video') ? '视频已上传 (点击更换)' : '上传反馈视频'}
                     </button>
  
                     {/* 音频反馈 */}
                     <button onClick={() => triggerUpload('audio')} className={`w-full py-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${hasFeedback('audio') ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 text-gray-500'}`}>
                        <Music size={16} /> {hasFeedback('audio') ? '音频已上传 (点击更换)' : '上传反馈音频'}
                     </button>
                  </div>
                  {uploadingMedia && <p className="text-center text-xs text-blue-500 mt-2 animate-pulse">正在上传媒体文件...</p>}
                </div>
  
                <div className="flex gap-2 pt-4 border-t">
                  <button onClick={handleSave} disabled={uploadingMedia} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all">保存</button>
                  <button onClick={() => setViewMode('list')} className="flex-1 bg-gray-100 py-3 rounded-xl text-gray-600 font-bold">取消</button>
                </div>
             </div>
          )}
        </div>
      </div>
    );
  };
