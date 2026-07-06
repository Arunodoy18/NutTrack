"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Mic, MicOff, Barcode, Maximize, User, RefreshCw, AlertTriangle, Check, Sparkles } from 'lucide-react';
import ComingSoon from "@/components/ComingSoon";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });
import { useSpeech } from "@/components/useSpeech";
import { 
  analyzeMealImageAction, 
  analyzeMealTextAction, 
  saveMealAction,
  lookupBarcodeAction 
} from "@/app/actions";

const SCAN_MESSAGES = [
  "Identifying ingredients...",
  "Calculating nutritional density...",
  "Estimating portion sizes...",
  "Cross-referencing USDA database...",
  "Finalizing macros..."
];

export interface SavedMealData {
  id: string;
  timestamp: string;
  summary: string;
  imageUrl?: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  items: { name: string; calories: number; protein: number; fat: number; carbs: number; fiber: number; estimatedQuantity: string }[];
}

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  isPremiumUser?: boolean;
  onMealSaved?: (mealData: SavedMealData) => void;
}

export default function CameraModal({ isOpen, onClose, userId, isPremiumUser, onMealSaved }: CameraModalProps) {
  const [activeModalMode, setActiveModalMode] = useState<'camera' | 'speak' | 'barcode'>('camera');
  const [uploadStep, setUploadStep] = useState<number>(0); 
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);
  const [scanningMsgIdx, setScanningMsgIdx] = useState(0);

  const [customMealName, setCustomMealName] = useState("");
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [mealSaveError, setMealSaveError] = useState<string | null>(null);

  const [localUserId, setLocalUserId] = useState<string | null>(userId || null);

  useEffect(() => {
    if (isOpen && !localUserId) {
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(data => {
          if (data?.user?.id) {
            setLocalUserId(data.user.id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, localUserId]);

  const handleSpeechResult = async (text: string) => {
    if (!text || text.trim() === "") return;
    setUploadStep(1);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setScanningMsgIdx(0);

    const msgInterval = setInterval(() => {
      setScanningMsgIdx(prev => (prev + 1) % SCAN_MESSAGES.length);
    }, 1500);

    const res = await analyzeMealTextAction(text);
    
    clearInterval(msgInterval);
    setIsAnalyzing(false);

    if (res.success && res.analysis) {
      setActiveAnalysis(res.analysis);
      setCustomMealName(res.analysis.name || "My Meal");
      setUploadStep(2);
    } else {
      setAnalysisError(res.error || "Failed to analyze speech.");
      setUploadStep(2);
    }
  };

  const { isListening, transcript, error: speechError, startListening, stopListening } = useSpeech();

  useEffect(() => {
    if (!isListening && transcript.trim().length > 0 && uploadStep === 0) {
      handleSpeechResult(transcript);
    }
  }, [isListening, transcript, uploadStep]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = async () => {
    if (!base64Image) return;
    setUploadStep(1);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setScanningMsgIdx(0);

    const msgInterval = setInterval(() => {
      setScanningMsgIdx(prev => (prev + 1) % SCAN_MESSAGES.length);
    }, 1500);

    const res = await analyzeMealImageAction(base64Image);
    
    clearInterval(msgInterval);
    setIsAnalyzing(false);

    if (res.success && res.analysis) {
      setActiveAnalysis(res.analysis);
      setCustomMealName(res.analysis.name || "My Meal");
      setUploadStep(2);
    } else {
      setAnalysisError(res.error || "Failed to analyze image.");
      setUploadStep(2);
    }
  };

  const handleBarcodeSuccess = async (barcode: string) => {
    // Only run if not already analyzing to prevent duplicate scans
    if (isAnalyzing || uploadStep !== 0) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setUploadStep(1); // Move to analyzing screen
    
    let dots = 0;
    const msgInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      setAnalyzeMsg("Looking up barcode" + ".".repeat(dots));
    }, 500);

    try {
      const res = await lookupBarcodeAction(barcode);
      clearInterval(msgInterval);
      setIsAnalyzing(false);

      if (res.success && res.analysis) {
        setActiveAnalysis(res.analysis);
        setCustomMealName(res.analysis.name || "Scanned Product");
        setUploadStep(2);
      } else {
        setAnalysisError(res.error || "Failed to lookup barcode.");
        setUploadStep(0);
      }
    } catch (err) {
      clearInterval(msgInterval);
      setIsAnalyzing(false);
      setAnalysisError("An unexpected error occurred.");
      setUploadStep(0);
    }
  };

  const handleSaveMeal = async () => {
    if (!activeAnalysis) return;
    if (!localUserId) {
      setMealSaveError("User not authenticated.");
      return;
    }
    setIsSavingMeal(true);
    setMealSaveError(null);
    
    try {
      const result = await saveMealAction(localUserId, {
        ...activeAnalysis,
        name: customMealName || activeAnalysis.name,
        imageUrl: base64Image || undefined,
      });

      if (result.success) {
        // Build optimistic meal data for instant UI update
        const savedMeal: SavedMealData = {
          id: `optimistic-${Date.now()}`,
          timestamp: new Date().toISOString(),
          summary: customMealName || activeAnalysis.name || "Meal",
          imageUrl: selectedImage || undefined,
          totalCalories: activeAnalysis.totalCalories || 0,
          totalProtein: activeAnalysis.totalProtein || 0,
          totalFat: activeAnalysis.totalFat || 0,
          totalCarbs: activeAnalysis.totalCarbs || 0,
          totalFiber: activeAnalysis.totalFiber || 0,
          items: (activeAnalysis.items || []).map((item: any) => ({
            name: item.name,
            calories: item.calories || 0,
            protein: item.protein || 0,
            fat: item.fat || 0,
            carbs: item.carbs || 0,
            fiber: item.fiber || 0,
            estimatedQuantity: item.estimatedQuantity || "1 serving",
          })),
        };
        onClose();
        if (onMealSaved) {
          onMealSaved(savedMeal);
        }
        
        // Reset states
        setTimeout(() => {
          setUploadStep(0);
          setSelectedImage(null);
          setBase64Image(null);
          setActiveAnalysis(null);
          setCustomMealName("");
          setActiveModalMode('camera');
        }, 500);
      } else {
        setMealSaveError(result.error || "Failed to save meal.");
      }
    } catch (err) {
      console.error(err);
      setMealSaveError("An unexpected error occurred.");
    } finally {
      setIsSavingMeal(false);
    }
  };

  const handleClose = () => {
    onClose();
    setActiveModalMode('camera');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-2xl bg-surface-muted border border-surface-line/80 rounded-[32px] overflow-hidden shadow-2xl flex flex-col my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-surface-line">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-50 text-brand">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-ink">AI Vision Meal Scanner</h3>
                <p className="text-xs text-ink-soft">Upload or select a nutritional plate snapshot to auto-extract macros.</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-1.5 text-ink-soft hover:text-ink rounded-xl bg-surface-line transition-all focus:ring-2 focus:ring-brand-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Switcher */}
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {/* STEP 0: Select / Upload */}
            {uploadStep === 0 && (
              <div className="flex flex-col items-center justify-center space-y-6">
                {/* The Central Viewport */}
                <div className="relative w-full max-w-sm aspect-square bg-[#1a1a1a] rounded-[32px] border-4 border-surface-muted overflow-hidden flex flex-col items-center justify-center shadow-inner">
                  {/* Expand icon in top right */}
                  <button 
                    onClick={() => setActiveModalMode('camera')}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors z-20"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>

                  {/* Viewport Content based on activeMode */}
                  {activeModalMode === 'camera' && (
                    <div className="flex flex-col items-center justify-center text-white/60">
                      <Camera className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-sm font-medium tracking-wide">Ready to Scan</p>
                    </div>
                  )}

                  {activeModalMode === 'speak' && (
                    <div className="flex flex-col items-center justify-center text-white/80 text-center px-8">
                      <User className={`w-16 h-16 mb-4 ${isListening ? 'text-red-500 animate-pulse' : 'text-white/50'}`} />
                      <p className="text-sm font-medium tracking-wide">
                        {isListening 
                          ? "Listening... speak now." 
                          : "Press Capture to start listening. When you stop talking, it will process."}
                      </p>
                      {transcript && isListening && (
                        <p className="text-xs text-red-400 italic mt-4">"{transcript}"</p>
                      )}
                    </div>
                  )}

                  {activeModalMode === 'barcode' && (
                    <div className="w-full h-full relative z-30">
                      <BarcodeScanner 
                        onScanSuccess={handleBarcodeSuccess} 
                        onScanError={(err) => console.log(err)} 
                      />
                    </div>
                  )}
                </div>

                {/* Top 3 Control Buttons */}
                <div className="flex items-center justify-center gap-6 w-full max-w-sm">
                  {/* Speak Button */}
                  <button 
                    onClick={() => setActiveModalMode('speak')}
                    className={`flex flex-col items-center gap-2 transition-all ${activeModalMode === 'speak' ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${activeModalMode === 'speak' ? 'border-brand bg-brand-50 text-brand' : 'border-surface-line bg-white text-ink-soft'}`}>
                      <Mic className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${activeModalMode === 'speak' ? 'text-brand' : 'text-ink-soft'}`}>Speak</span>
                  </button>

                  {/* Upload Button (Directly triggers file picker) */}
                  <div className="relative flex flex-col items-center gap-2 transition-all opacity-60 hover:opacity-100">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    <div className="w-14 h-14 rounded-full border-2 border-surface-line bg-white flex items-center justify-center text-ink-soft">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Upload</span>
                  </div>

                  {/* Barcode Button */}
                  <button 
                    onClick={() => setActiveModalMode('barcode')}
                    className={`flex flex-col items-center gap-2 transition-all ${activeModalMode === 'barcode' ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${activeModalMode === 'barcode' ? 'border-brand bg-brand-50 text-brand' : 'border-surface-line bg-white text-ink-soft'}`}>
                      <Barcode className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${activeModalMode === 'barcode' ? 'text-brand' : 'text-ink-soft'}`}>Barcode</span>
                  </button>
                </div>

                {/* Main Capture Button */}
                <div className="w-full max-w-sm pt-4">
                  {activeModalMode === 'camera' && (
                    <div className="relative w-full">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <button className="w-full py-4 bg-brand rounded-full text-white font-black text-lg shadow-xl shadow-brand/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-4 border-brand-100">
                        <Camera className="w-6 h-6" />
                        CAPTURE
                      </button>
                    </div>
                  )}

                  {activeModalMode === 'speak' && (
                    <button 
                      onPointerDown={startListening}
                      onPointerUp={stopListening}
                      onPointerLeave={stopListening}
                      className={`w-full py-4 rounded-full text-white font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-4 ${isListening ? 'bg-red-500 border-red-200 shadow-red-500/30 animate-pulse' : 'bg-ink border-ink-soft/30 shadow-ink/30'}`}
                    >
                      {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                      {isListening ? "RECORDING..." : "HOLD TO SPEAK"}
                    </button>
                  )}

                  {activeModalMode === 'barcode' && (
                    <div className="w-full py-4 bg-ink rounded-full text-white/50 font-black text-lg shadow-xl shadow-ink/10 flex items-center justify-center gap-2 border-4 border-ink-soft/30 cursor-not-allowed">
                      <Barcode className="w-6 h-6" />
                      POINT AT BARCODE
                    </div>
                  )}
                </div>
                
                {speechError && (
                  <div className="mt-2 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-600 w-full text-center">
                     {speechError}
                  </div>
                )}

                {selectedImage && activeModalMode !== 'barcode' && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleStartAnalysis}
                      className="px-6 py-3 bg-brand-600 hover:bg-brand-500 font-bold text-white text-sm rounded-xl transition-all shadow-lg shadow-brand-600/30 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Run AI Analyzer</span>
                    </button>
                  </div>
                )}
                
                {selectedImage && activeModalMode === 'barcode' && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      disabled={true}
                      className="w-full bg-surface-muted border-2 border-surface-line text-ink-soft font-black text-sm tracking-widest uppercase rounded-[20px] py-4 flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Barcode className="w-5 h-5" />
                      Scanning Barcode...
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: Scanning Beam Overlay */}
            {uploadStep === 1 && (
              <div className="flex flex-col items-center justify-center p-8 space-y-8">
                {/* Glowing Scanner Box */}
                <div className="relative w-72 h-52 rounded-[24px] overflow-hidden border border-surface-line bg-white shadow-2xl shadow-brand/10 flex items-center justify-center">
                  {selectedImage ? (
                    <img 
                      src={selectedImage} 
                      alt="Analyzing..." 
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="p-6 text-center z-20">
                      {activeModalMode === 'barcode' ? (
                        <>
                          <Barcode className="w-12 h-12 text-brand mx-auto mb-4 animate-pulse" />
                          <p className="text-xs font-semibold text-ink-soft italic">{analyzeMsg || "Querying OpenFoodFacts..."}</p>
                        </>
                      ) : (
                        <>
                          <Mic className="w-12 h-12 text-brand mx-auto mb-4 animate-pulse" />
                          <p className="text-xs font-semibold text-ink-soft italic">"{transcript}"</p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  <motion.div 
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                    animate={{ y: [0, 204, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                  />

                  <div className="absolute inset-2 border border-brand/20 rounded-[18px] pointer-events-none" />
                </div>

                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 text-brand animate-spin" />
                    <span className="text-sm font-black text-ink tracking-wide uppercase">
                      {activeModalMode === 'barcode' ? 'Looking up Database' : 'AI Dissection Live'}
                    </span>
                  </div>
                  {activeModalMode !== 'barcode' && (
                    <motion.p 
                      key={scanningMsgIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-brand font-extrabold text-sm min-h-[20px]"
                    >
                      {SCAN_MESSAGES[scanningMsgIdx]}
                    </motion.p>
                  )}
                  <p className="text-xs text-ink-faint">
                    {activeModalMode === 'barcode' 
                      ? 'Wait a second while we fetch exact nutrition facts...' 
                      : 'Wait a few seconds for computer-vision calorie estimation...'}
                  </p>
                </div>

                <div className="w-48 h-1 bg-white rounded-full overflow-hidden border border-surface-line">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-brand to-brand-500"
                    initial={{ width: "10%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4.8, ease: "linear" }}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Review and Edit analysis */}
            {uploadStep === 2 && (
              <div className="space-y-6">
                {analysisError ? (
                  <div className="p-6 bg-surface-muted rounded-3xl border border-red-500/20 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto border border-red-500/20">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-ink">AI Dissection Failed</h4>
                      <p className="text-xs text-ink-soft mt-1 leading-relaxed max-w-sm mx-auto">
                        {analysisError}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUploadStep(0);
                        setSelectedImage(null);
                        setBase64Image(null);
                        setActiveAnalysis(null);
                        setAnalysisError(null);
                      }}
                      className="px-4 py-2 bg-surface-muted hover:bg-surface-line text-xs font-semibold rounded-xl text-ink-soft transition-all"
                    >
                      Try Another Image
                    </button>
                  </div>
                ) : activeAnalysis ? (
                  <>
                    {mealSaveError && (
                      <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{mealSaveError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Left Side: Photo preview details */}
                      <div className="md:col-span-5 space-y-4">
                        <div className="relative h-44 rounded-2xl overflow-hidden border border-surface-line shadow-lg bg-surface-muted flex items-center justify-center">
                          {selectedImage ? (
                            <img 
                              src={selectedImage} 
                              alt="Analyzed food" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-ink-soft opacity-50">
                              <Barcode className="w-16 h-16 mb-2" />
                              <span className="text-xs font-bold uppercase tracking-widest">Scanned Product</span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3 px-2 py-0.5 bg-emerald-500/20 text-emerald-600 text-[10px] font-black tracking-widest rounded-lg border border-emerald-500/20 backdrop-blur-sm shadow-sm uppercase">
                            USDA / OFF Matched
                          </div>
                        </div>

                        {/* Calorie and Nutrient Highlights */}
                        <div className="p-4 bg-surface-muted rounded-2xl border border-surface-line space-y-3">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-extrabold text-ink-soft uppercase tracking-widest">Total Energy</span>
                            <span className="font-display text-xl font-black text-ink">{activeAnalysis.totalCalories} kcal</span>
                          </div>
                          <hr className="border-surface-line" />
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                              <p className="text-[10px] font-bold text-ink-faint uppercase">Protein</p>
                              <p className="text-sm font-extrabold text-emerald-600 mt-0.5">{activeAnalysis.totalProtein}g</p>
                            </div>
                            <div className="bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                              <p className="text-[10px] font-bold text-ink-faint uppercase">Fat</p>
                              <p className="text-sm font-extrabold text-amber-600 mt-0.5">{activeAnalysis.totalFat}g</p>
                            </div>
                            <div className="bg-blue-500/5 p-2 rounded-xl border border-blue-500/10">
                              <p className="text-[10px] font-bold text-ink-faint uppercase">Fiber</p>
                              <p className="text-sm font-extrabold text-blue-600 mt-0.5">{activeAnalysis.totalFiber}g</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Customizable settings & item breakdown */}
                      <div className="md:col-span-7 space-y-4">
                        {/* Name input */}
                        <div>
                          <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block mb-1">Meal Title</label>
                          <input 
                            type="text" 
                            value={customMealName}
                            onChange={(e) => setCustomMealName(e.target.value)}
                            placeholder="My Gourmet Feast Bowl"
                            className="w-full px-4 py-2.5 bg-white border border-surface-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>

                        {/* Items breakdown */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block mb-1">Estimated Plate Breakdown</label>
                          <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                            {activeAnalysis.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-2.5 bg-surface-muted border border-surface-line rounded-xl text-xs">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-ink">{item.name}</p>
                                  <p className="text-[10px] text-ink-faint">Portion: {item.estimatedQuantity || "100g"}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-extrabold text-ink-soft">{item.calories} kcal</p>
                                  <p className="text-[9px] text-ink-faint">P:{item.protein}g | F:{item.fat}g | Fib:{item.fiber}g</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex gap-3 justify-end pt-5 border-t border-surface-line mt-6">
                      <button
                        type="button"
                        onClick={() => setUploadStep(0)}
                        className="px-5 py-2.5 bg-surface-muted hover:bg-surface-muted border border-surface-line rounded-xl text-ink-soft font-semibold text-sm transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={isSavingMeal}
                        onClick={handleSaveMeal}
                        className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
                      >
                        {isSavingMeal ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Log to History</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
