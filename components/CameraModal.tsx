"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { compressImageFile, compressDataUrl, makeThumb } from '@/lib/imageCompress';
import ManualMealForm from '@/components/ManualMealForm';
import { showToast } from '@/components/OfflineStatusBar';
import { enqueueOp } from '@/lib/offlineQueue';
import { createStableReader } from '@/lib/barcode';
import { scaleAnalysis } from '@/lib/openfoodfacts';
import { useOnline } from '@/lib/useOfflineSync';
import { Camera, Upload, X, Mic, MicOff, Barcode, Maximize, User, RefreshCw, AlertTriangle, Check, Sparkles } from 'lucide-react';
import ComingSoon from "@/components/ComingSoon";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center w-full h-full text-white/50">
      <RefreshCw className="w-8 h-8 mb-4 animate-spin" />
      <p className="text-xs font-medium tracking-wide">Connecting to camera hardware...</p>
    </div>
  )
});
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
  mealSession?: string;
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
  /** Signed-in account (owner of the offline queue); differs from userId when tracking a family member. */
  accountUserId?: string;
  isPremiumUser?: boolean;
  onMealSaved?: (mealData: SavedMealData) => void;
}

export default function CameraModal({ isOpen, onClose, userId, accountUserId, isPremiumUser, onMealSaved }: CameraModalProps) {
  const [activeModalMode, setActiveModalMode] = useState<'camera' | 'speak' | 'barcode' | 'manual'>('camera');
  const online = useOnline();
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [networkFailed, setNetworkFailed] = useState(false);
  const [manualMode, setManualMode] = useState<'search' | 'numbers' | 'describe'>('search');
  // The scanner reports the same code on every frame (10/s): act on the first one only.
  const barcodeLock = useRef(false);
  // Ignore misreads: a code needs a valid check digit and two consecutive sightings.
  const stableRead = useRef(createStableReader());
  useEffect(() => { stableRead.current = createStableReader(); }, [isOpen, activeModalMode]);
  const [uploadStep, setUploadStep] = useState<number>(0); 
  useEffect(() => { barcodeLock.current = false; }, [activeModalMode, isOpen, uploadStep]);
  // Free plan: how many AI scans are left today (refreshed when the scanner opens and after every analysis).
  useEffect(() => {
    if (!isOpen || !online) return;
    let live = true;
    fetch('/api/scans', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j) setQuota({ remaining: j.remaining, limit: j.limit }); }).catch(() => {});
    return () => { live = false; };
  }, [isOpen, online, uploadStep]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const captureWebcam = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setSelectedImage(imageSrc);
      setBase64Image(imageSrc); // show instantly, then swap for a compressed copy
      compressDataUrl(imageSrc).then(setBase64Image).catch(() => {});
    }
  }, [webcamRef]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);
  const [scanningMsgIdx, setScanningMsgIdx] = useState(0);
  const [analyzeMsg, setAnalyzeMsg] = useState("");

  const [customMealName, setCustomMealName] = useState("");
  // Scanned products: the pack's own serving, scaled by what was actually eaten.
  const [barcodeBase, setBarcodeBase] = useState<any>(null);
  const [portion, setPortion] = useState(1);
  const choosePortion = (f: number) => { setPortion(f); if (barcodeBase) setActiveAnalysis(scaleAnalysis(barcodeBase, f)); };
  useEffect(() => { if (uploadStep === 0) { setBarcodeBase(null); setPortion(1); } }, [uploadStep]);
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

    try {
      const res = await runWithSafety(() => analyzeMealTextAction(text));
      if (res.success && res.analysis) {
        setActiveAnalysis(res.analysis);
        setCustomMealName(res.analysis.name || "My Meal");
      } else {
        setAnalysisError(res.error || "Failed to analyze speech.");
      }
    } catch (err) {
      setNetworkFailed(isNetworkError(err));
      setAnalysisError(friendlyError(err));
    } finally {
      clearInterval(msgInterval);
      setIsAnalyzing(false);
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
      // INSTANT UI UPDATE: Use a blob URL so the user immediately sees the image.
      const url = URL.createObjectURL(file);
      setSelectedImage((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setBase64Image(null);
      setAnalysisError(null);

      // Downscale + re-encode off the critical path so the preview shows instantly
      // and the upload is ~100–300 KB instead of several MB.
      compressImageFile(file)
        .then(setBase64Image)
        .catch((err) => {
          setSelectedImage(null);
          setAnalysisError(err?.message || "Could not read that image. Try another photo.");
        });
    }
    // allow re-selecting the same file
    e.target.value = "";
  };

  /** Runs an analysis with a timeout and guarantees the UI never gets stuck. */
  const runWithSafety = async <T,>(task: () => Promise<T>, ms = 45000): Promise<T> => {
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), ms)
      ),
    ]);
  };

  const isNetworkError = (err: unknown) =>
    (err instanceof Error && err.message === "timeout") ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (err instanceof TypeError); // fetch failure surfaces as TypeError

  const friendlyError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "timeout") return "That took too long. Check your connection and try again.";
    if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Reconnect and try again.";
    return "Something went wrong analysing that. Please try again.";
  };

  const handleStartAnalysis = async () => {
    if (!base64Image || isAnalyzing) return;
    setUploadStep(1);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setScanningMsgIdx(0);

    const msgInterval = setInterval(() => {
      setScanningMsgIdx(prev => (prev + 1) % SCAN_MESSAGES.length);
    }, 1500);

    try {
      const res = await runWithSafety(() => analyzeMealImageAction(base64Image));
      if (res.success && res.analysis) {
        setActiveAnalysis(res.analysis);
        setCustomMealName(res.analysis.name || "My Meal");
      } else {
        setAnalysisError(res.error || "Failed to analyze image.");
      }
    } catch (err) {
      setNetworkFailed(isNetworkError(err));
      setAnalysisError(friendlyError(err));
    } finally {
      clearInterval(msgInterval);
      setIsAnalyzing(false);
      setUploadStep(2);
    }
  };

  /** Save the current photo on this device; it's analysed and logged automatically once online. */
  const handleQueuePhoto = async () => {
    if (!base64Image || !localUserId) return;
    try {
      let thumb: string | undefined;
      try { thumb = await makeThumb(base64Image); } catch { /* no preview is fine */ }
      await enqueueOp({ userId: localUserId, ownerId: accountUserId ?? localUserId, kind: 'meal_photo', eatenAt: Date.now(), image: base64Image, thumb });
      showToast("Photo saved — Nura will log it when you're back online");
      onClose();
      setTimeout(() => {
        setUploadStep(0);
        setSelectedImage(null);
        setBase64Image(null);
        setAnalysisError(null);
        setNetworkFailed(false);
        setActiveModalMode('camera');
      }, 400);
    } catch (e: any) {
      setAnalysisError(e?.message || "Couldn't save the photo on this device.");
      setNetworkFailed(false);
      setUploadStep(2);
    }
  };

  const handleBarcodeSuccess = async (barcode: string) => {
    // Only run if not already analyzing to prevent duplicate scans
    if (isAnalyzing || uploadStep !== 0) return;
    if (!stableRead.current(barcode)) return;
    if (barcodeLock.current) return;
    barcodeLock.current = true;

    // Offline: the code was read on the phone; save it and look the product up once back online.
    if (typeof navigator !== 'undefined' && !navigator.onLine && localUserId) {
      try {
        await enqueueOp({ userId: localUserId, ownerId: accountUserId ?? localUserId, kind: 'meal_barcode', eatenAt: Date.now(), barcode });
        showToast("Barcode saved — Nura will look it up and log it when you're online");
        onClose();
        setActiveModalMode('camera');
      } catch (e: any) {
        setAnalysisError(e?.message || "Couldn't save that barcode.");
        setUploadStep(2);
      }
      return;
    }
    
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
        setBarcodeBase(res.analysis);
        setPortion(1);
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
    if (!activeAnalysis || isSavingMeal) return; // ignore double taps
    if (!localUserId) {
      setMealSaveError("User not authenticated.");
      return;
    }
    setIsSavingMeal(true);
    setMealSaveError(null);
    
    try {
      let thumb: string | undefined;
      try { thumb = base64Image ? await makeThumb(base64Image) : undefined; } catch { /* no preview is fine */ }
      const result = await saveMealAction(localUserId, {
        ...activeAnalysis,
        name: customMealName || activeAnalysis.name,
        imageUrl: thumb,
      });

      if (result.success) {
        // Build optimistic meal data for instant UI update
        const savedMeal: SavedMealData = {
          id: (result as { mealId?: string }).mealId ?? `optimistic-${Date.now()}`,
          mealSession: activeAnalysis.mealSession,
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
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 sm:p-4 backdrop-blur-sm"
        >
          <div className="w-full h-full sm:max-w-[420px] sm:h-[85vh] bg-black sm:rounded-[40px] overflow-hidden flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.5)] border-surface-line sm:border">
            
            {/* Header - Floating Top */}
            <div className={`absolute top-0 inset-x-0 z-50 flex items-center justify-between p-6 ${activeModalMode === 'manual' ? 'bg-black' : 'bg-gradient-to-b from-black/70 via-black/40 to-transparent'}`}>
              <div>
                <h3 className="font-display text-white text-lg font-bold drop-shadow-md tracking-wide">
                  {uploadStep === 0 ? "Scanner" : uploadStep === 1 ? "Analyzing" : "Results"}
                </h3>
                {quota && uploadStep !== 1 && (
                  <p className={`mt-0.5 text-[11px] font-bold drop-shadow ${quota.remaining === 0 ? 'text-amber-300' : 'text-white/80'}`} role="status">
                    {quota.remaining === 0 ? 'No free AI scans left today · search & barcode still work' : `${quota.remaining} of ${quota.limit} free AI scans left today`}
                  </p>
                )}
              </div>
              <button 
                onClick={handleClose}
                className="w-10 h-10 flex items-center justify-center text-white bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 0: Select / Upload */}
            {uploadStep === 0 && (
              <div className="flex-1 w-full h-full flex flex-col relative">
                {/* Upper Viewport (Camera/Barcode/Speak) */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                  {activeModalMode === 'camera' && (
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "environment" }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {selectedImage && (activeModalMode === 'camera' || activeModalMode === 'speak') && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedImage} alt="Selected meal" className="absolute inset-0 w-full h-full object-cover z-[5]" />
                  )}
                  {activeModalMode === 'barcode' && (
                    <div className="absolute inset-0 w-full h-full">
                      <BarcodeScanner 
                        onScanSuccess={handleBarcodeSuccess} 
                        onScanError={(err) => console.log(err)} 
                      />
                    </div>
                  )}
                  {activeModalMode === 'manual' && localUserId && (
                    <ManualMealForm
                      userId={localUserId}
                      accountUserId={accountUserId}
                      defaultMode={manualMode}
                      onSaved={(name) => {
                        showToast(online ? `Logged "${name}"` : `Saved "${name}" — will sync when you're online`);
                        onClose();
                        setActiveModalMode('camera');
                      }}
                    />
                  )}
                  {activeModalMode === 'speak' && !online && (
                    <div className="absolute inset-0 z-20 bg-black/85 flex flex-col items-center justify-center text-center px-8 text-white">
                      <p className="text-lg font-black mb-2">Voice needs a connection</p>
                      <p className="text-sm text-white/60 font-medium mb-5">
                        Type what you ate instead — Nura&apos;s AI will work out the nutrition and log it as soon as you&apos;re back online.
                      </p>
                      <button onClick={() => { setManualMode('describe'); setActiveModalMode('manual'); }} className="px-6 py-3 rounded-full bg-white text-black font-bold text-sm">
                        Describe my meal
                      </button>
                    </div>
                  )}
                  {activeModalMode === 'speak' && online && (
                    <div className="flex flex-col items-center justify-center text-white/90 text-center px-8 z-10">
                      <motion.div 
                        animate={isListening ? { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="p-6 bg-white/10 backdrop-blur-md rounded-full mb-6"
                      >
                        <Mic className={`w-12 h-12 ${isListening ? 'text-red-500' : 'text-white'}`} />
                      </motion.div>
                      <h2 className="text-2xl font-black mb-2">{isListening ? "Listening..." : "Voice Logger"}</h2>
                      <p className="text-sm text-white/60 font-medium">Hold the button below and describe your meal.</p>
                      {transcript && isListening && (
                        <p className="mt-6 text-lg text-emerald-400 font-bold italic">"{transcript}"</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Controls Panel */}
                <div className="w-full bg-black pb-8 pt-6 px-6 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 relative">
                  {/* Mode Selector */}
                  <div className="flex p-1 bg-white/10 backdrop-blur-md rounded-full mb-8 relative z-10">
                    {(['camera', 'barcode', 'speak', 'manual'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => { if (mode === 'manual') setManualMode('search'); setActiveModalMode(mode); }}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${
                          activeModalMode === mode 
                            ? 'bg-white text-black shadow-md' 
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* Shutter Row */}
                  <div className={`flex items-center justify-between relative z-10 ${activeModalMode === 'manual' ? 'hidden' : ''}`}>
                    {/* Left: Upload */}
                    <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer backdrop-blur-md text-white">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <Upload className="w-6 h-6" />
                    </div>

                    {/* Center: Main Action Button */}
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={activeModalMode === 'camera' ? captureWebcam : undefined}
                      onPointerDown={activeModalMode === 'speak' ? startListening : undefined}
                      onPointerUp={activeModalMode === 'speak' ? stopListening : undefined}
                      onPointerLeave={activeModalMode === 'speak' ? stopListening : undefined}
                      className="relative w-20 h-20 rounded-full flex items-center justify-center border-4 border-white p-1"
                    >
                      <div className={`w-full h-full rounded-full transition-colors ${
                        activeModalMode === 'camera' ? 'bg-white' : 
                        activeModalMode === 'speak' ? (isListening ? 'bg-red-500' : 'bg-white') : 
                        'bg-white/20'
                      }`} />
                    </motion.button>

                    {/* Right: Dummy spacer for balance */}
                    <div className="w-14 h-14" />
                  </div>
                  
                  {/* Speech Error */}
                  {speechError && (
                    <p className="absolute bottom-2 inset-x-0 text-center text-xs text-red-500">{speechError}</p>
                  )}
                  
                  {/* Analysis specific states */}
                  {selectedImage && activeModalMode !== 'barcode' && (
                     <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-t-[40px] z-50 flex items-center justify-center">
                        {online ? (
                          <button
                            type="button"
                            onClick={handleStartAnalysis}
                            className="px-8 py-4 bg-brand hover:bg-brand-500 font-bold text-white text-lg rounded-full shadow-lg shadow-brand/40 flex items-center gap-3 transition-all hover:scale-105"
                          >
                            <Sparkles className="w-5 h-5" />
                            <span>Analyze Photo</span>
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-3 px-8 text-center">
                            <p className="text-white/70 text-sm font-medium">You&apos;re offline. Save this photo and Nura will analyze and log it as soon as you&apos;re back online.</p>
                            <button
                              type="button"
                              onClick={handleQueuePhoto}
                              disabled={!base64Image}
                              className="px-8 py-4 bg-brand font-bold text-white text-lg rounded-full shadow-lg shadow-brand/40 flex items-center gap-3 disabled:opacity-50"
                            >
                              <Sparkles className="w-5 h-5" />
                              <span>Save for later</span>
                            </button>
                            <button type="button" onClick={() => { setSelectedImage(null); setBase64Image(null); }} className="text-white/60 text-sm font-bold">
                              Retake
                            </button>
                          </div>
                        )}
                     </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: Scanning Beam Overlay */}
            {uploadStep === 1 && (
              <div className="flex-1 w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
                {/* Full screen background image */}
                {selectedImage ? (
                  <img src={selectedImage} alt="Scanning" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="absolute inset-0 bg-surface-muted flex items-center justify-center">
                    {activeModalMode === 'barcode' ? <Barcode className="w-20 h-20 text-brand animate-pulse opacity-50" /> : <Mic className="w-20 h-20 text-brand animate-pulse opacity-50" />}
                  </div>
                )}
                
                {/* Laser Animation */}
                {selectedImage && (
                  <motion.div 
                    className="absolute inset-x-0 h-1 bg-brand shadow-[0_0_20px_rgba(34,211,238,1)] z-20"
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                )}

                {/* AI Thought Process HUD */}
                <div className="relative z-30 bg-black/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center max-w-[80%] shadow-2xl">
                  <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                  <motion.p 
                    key={scanningMsgIdx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-white font-display text-lg font-bold tracking-wide leading-snug"
                  >
                    {activeModalMode === 'barcode' ? analyzeMsg || "Querying Database..." : SCAN_MESSAGES[scanningMsgIdx]}
                  </motion.p>
                </div>
              </div>
            )}

            {/* STEP 2: Receipt UI */}
            {uploadStep === 2 && (
              <div className="flex-1 w-full h-full bg-[#f4f4f5] flex flex-col relative pt-20">
                {analysisError ? (
                  <div className="p-8 text-center space-y-4">
                     <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                     <h2 className="text-xl font-bold text-ink">Scan Failed</h2>
                     <p className="text-ink-soft text-sm">{analysisError}</p>
                     {networkFailed && base64Image && (
                       <button onClick={handleQueuePhoto} className="mt-6 px-8 py-4 bg-brand text-white rounded-full font-bold shadow-lg block mx-auto">
                         Save photo &amp; log it when I&apos;m online
                       </button>
                     )}
                     <button onClick={() => { setNetworkFailed(false); setUploadStep(0); }} className="mt-4 px-8 py-4 bg-ink text-white rounded-full font-bold shadow-lg">Try Again</button>
                  </div>
                ) : activeAnalysis ? (
                  <div className="flex-1 overflow-y-auto px-4 pb-[120px] pt-4 custom-scrollbar">
                    {/* The Receipt Box */}
                    <div className="bg-white rounded-[24px] shadow-sm border border-surface-line overflow-hidden relative">
                      {/* Receipt ZigZag Bottom (pure css trick using border image or just a simple drop shadow block, let's keep it simple with clean rounding) */}
                      
                      {selectedImage && (
                        <div className="w-full h-48 relative">
                          <img src={selectedImage} alt="Meal" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                            <span className="bg-brand/90 backdrop-blur text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase shadow-lg">AI Verified</span>
                            <span className="text-white font-black text-3xl drop-shadow-md">{activeAnalysis.totalCalories} <span className="text-sm text-white/80">kcal</span></span>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-6 space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-ink-faint uppercase tracking-widest block mb-2">Meal Title</label>
                          <input 
                            type="text" 
                            value={customMealName}
                            onChange={(e) => setCustomMealName(e.target.value)}
                            className="w-full text-2xl font-display font-black text-ink bg-transparent border-b-2 border-surface-line focus:border-brand focus:outline-none pb-2 transition-colors placeholder:text-ink-faint"
                            placeholder="Name your meal..."
                          />
                        </div>

                        {barcodeBase && (
                          <div>
                            <label className="text-[10px] font-black text-ink-faint uppercase tracking-widest block mb-2">How much did you have? <span className="normal-case font-semibold">(pack serving: {barcodeBase.items?.[0]?.estimatedQuantity})</span></label>
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Portion">
                              {[0.5, 1, 1.5, 2, 3].map((f) => (
                                <button key={f} type="button" onClick={() => choosePortion(f)} aria-pressed={portion === f}
                                  className={`px-4 py-2 rounded-full text-sm font-bold border ${portion === f ? 'bg-brand text-white border-brand' : 'bg-white text-ink border-surface-line'}`}>{f}×</button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Macro Grid */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Protein</span>
                            <span className="text-xl font-black text-emerald-700">{activeAnalysis.totalProtein}g</span>
                          </div>
                          <div className="bg-amber-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-amber-100">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Fat</span>
                            <span className="text-xl font-black text-amber-700">{activeAnalysis.totalFat}g</span>
                          </div>
                          <div className="bg-violet-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-violet-100">
                            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">Carbs</span>
                            <span className="text-xl font-black text-violet-700">{activeAnalysis.totalCarbs}g</span>
                          </div>
                        </div>
                        
                        {/* Receipt Line Items */}
                        <div className="pt-6 border-t-2 border-dashed border-surface-line space-y-4">
                          <span className="text-[10px] font-black text-ink-faint uppercase tracking-widest block">Itemized Breakdown</span>
                          {activeAnalysis.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-start text-sm">
                              <div className="pr-4">
                                <p className="font-bold text-ink leading-tight text-base">{item.name}</p>
                                <p className="text-[11px] font-semibold text-ink-soft mt-1">{item.estimatedQuantity || "1 serving"}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-ink text-base">{item.calories} <span className="text-xs text-ink-soft font-medium">kcal</span></p>
                                <p className="text-[10px] font-bold text-ink-faint mt-1 tracking-wide">P:{item.protein} F:{item.fat} C:{item.carbs}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Footer Save Button (Fixed to bottom) */}
                {uploadStep === 2 && activeAnalysis && !analysisError && (
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#f4f4f5] via-[#f4f4f5] to-transparent pt-12">
                    <button
                      disabled={isSavingMeal}
                      onClick={handleSaveMeal}
                      className="w-full py-5 bg-ink hover:bg-ink/90 text-white font-black text-lg tracking-wide uppercase rounded-full shadow-2xl transition-all flex items-center justify-center gap-2"
                    >
                      {isSavingMeal ? (
                        <><RefreshCw className="w-5 h-5 animate-spin" /> SAVING...</>
                      ) : (
                        <><Check className="w-5 h-5" /> LOG MEAL</>
                      )}
                    </button>
                    {mealSaveError && (
                      <p className="text-center text-xs text-red-500 mt-2 font-semibold">{mealSaveError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
