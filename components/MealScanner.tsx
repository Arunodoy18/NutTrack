"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Upload, CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface MealScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: any) => void;
  isPremium?: boolean;
}

const SCAN_MESSAGES = [
  "Detecting culinary ingredients...",
  "Estimating portion weights & sizes...",
  "Calculating protein & fibers...",
  "Consulting USDA databases...",
  "Formulating coaching suggestions..."
];

const ERROR_MESSAGES: Record<string, string> = {
  not_food:     "Doesn't look like a meal — try a photo of your plate.",
  rate_limit:   "You've used your 5 free scans today. Upgrade for unlimited.",
  ai_error:     "AI is resting — try again in a moment.",
  parse_error:  "Couldn't read that clearly. Try better lighting or a closer shot.",
  network:      "Connection hiccup — check your signal and tap retry.",
  invalid_mime: "Please upload a JPEG, PNG, or WebP image.",
};

export function MealScanner({ isOpen, onClose, onScanSuccess, isPremium }: MealScannerProps) {
  const [uploadStep, setUploadStep] = useState(0); // 0: select, 1: scanning, 2: review
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);
  const [scanningMsgIdx, setScanningMsgIdx] = useState(0);

  // Dynamic laser scanning progress ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (uploadStep === 1) {
      setScanningMsgIdx(0);
      interval = setInterval(() => {
        setScanningMsgIdx((prev) => {
          if (prev < SCAN_MESSAGES.length - 1) {
            return prev + 1;
          } else {
            if (isAnalyzing) return prev;
            clearInterval(interval);
            setUploadStep(2);
            return prev;
          }
        });
      }, 950);
    }
    return () => clearInterval(interval);
  }, [uploadStep, isAnalyzing]);

  useEffect(() => {
    if (uploadStep === 1 && !isAnalyzing && activeAnalysis && scanningMsgIdx === SCAN_MESSAGES.length - 1) {
      setUploadStep(2);
    }
    if (uploadStep === 1 && !isAnalyzing && analysisError && scanningMsgIdx === SCAN_MESSAGES.length - 1) {
      setUploadStep(2);
    }
  }, [isAnalyzing, activeAnalysis, analysisError, uploadStep, scanningMsgIdx]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setActiveAnalysis(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        setBase64Image(base64);
        setMimeType(file.type);
        runAiAnalysis(base64, file.type);
      };
      reader.readAsDataURL(file);
      setAnalysisError(null);
      setUploadStep(1);
    }
  };

  const runAiAnalysis = async (b64: string, mime: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await fetch("/api/scan-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mimeType: mime }),
      });

      const res = await response.json();

      if (!response.ok) {
        const errorKey = res.error as keyof typeof ERROR_MESSAGES;
        setAnalysisError(ERROR_MESSAGES[errorKey] || res.message || ERROR_MESSAGES.ai_error);
        return;
      }

      if (res.success && res.data) {
        setActiveAnalysis(res.data);
      } else {
        setAnalysisError(ERROR_MESSAGES.parse_error);
      }
    } catch (err) {
      console.error(err);
      setAnalysisError(ERROR_MESSAGES.network);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMeal = () => {
    if (!activeAnalysis) return;
    onScanSuccess(activeAnalysis);
    handleClose();
  };

  const handleClose = () => {
    setUploadStep(0);
    setSelectedImage(null);
    setBase64Image(null);
    setMimeType(null);
    setActiveAnalysis(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-surface-muted/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 w-full max-w-2xl mx-auto bg-white border-t border-surface-line rounded-t-[32px] overflow-hidden shadow-[0_-10px_40px_rgba(44,42,37,0.1)] flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-line/60 bg-surface-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-l text-brand">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Meal Scanner</h3>
                  <p className="text-xs text-ink-2">Upload a photo to extract macros.</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-1.5 text-ink-2 hover:text-ink rounded-xl bg-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Switcher */}
            <div className="p-6 flex-1 overflow-y-auto">
              {uploadStep === 0 && (
                <div className="relative border-2 border-dashed border-surface-line hover:border-orange transition-all rounded-3xl bg-surface-muted p-8 text-center flex flex-col items-center justify-center gap-3 group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-surface-line text-ink-2 group-hover:bg-brand-l group-hover:text-brand transition-all shadow-custom">
                    <Upload className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-ink group-hover:text-brand transition-all">Tap to Upload Photo</p>
                </div>
              )}

              {uploadStep === 1 && (
                <div className="flex flex-col items-center py-8">
                  <div className="relative w-48 h-48 rounded-3xl overflow-hidden border-2 border-orange/30 shadow-2xl">
                    {selectedImage && <img src={selectedImage} alt="Scanning" className="w-full h-full object-cover" />}
                    <motion.div 
                      className="absolute inset-x-0 h-1 bg-brand shadow-[0_0_15px_rgba(224,122,58,0.8)]"
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <div className="mt-6 flex items-center gap-2">
                    {isAnalyzing && <Loader2 className="w-4 h-4 text-brand animate-spin" />}
                    <p className="text-sm font-medium text-ink animate-pulse">
                      {SCAN_MESSAGES[scanningMsgIdx]}
                    </p>
                  </div>
                </div>
              )}

              {uploadStep === 2 && analysisError && (
                <div className="flex flex-col items-center text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-red-500-l text-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-ink">Oops!</h4>
                    <p className="text-sm text-ink-2 mt-1">{analysisError}</p>
                  </div>
                  <button 
                    onClick={() => setUploadStep(0)}
                    className="mt-4 px-6 py-2.5 bg-surface-muted border border-surface-line rounded-xl font-semibold text-ink text-sm hover:bg-white transition-all"
                  >
                    Try Another Photo
                  </button>
                </div>
              )}

              {uploadStep === 2 && activeAnalysis && !analysisError && (
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <img src={selectedImage || ""} className="w-24 h-24 rounded-2xl object-cover border border-surface-line shadow-custom" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold text-ink">{activeAnalysis.name || "Custom Meal"}</h4>
                        {activeAnalysis.confidence && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            activeAnalysis.confidence > 0.8 ? 'bg-emerald-500-l text-emerald-500' : 'bg-brand-l text-brand'
                          }`}>
                            {(activeAnalysis.confidence * 100).toFixed(0)}% Match
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink-2 mt-1">{activeAnalysis.summary || "Extracted from your photo."}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-surface-muted border border-surface-line p-3 rounded-2xl text-center">
                      <div className="text-xs text-ink-2 mb-1">Cals</div>
                      <div className="text-lg font-black text-ink">{activeAnalysis.totalCalories}</div>
                    </div>
                    <div className="bg-surface-muted border border-surface-line p-3 rounded-2xl text-center">
                      <div className="text-xs text-ink-2 mb-1">Protein</div>
                      <div className="text-lg font-black text-emerald-500">{activeAnalysis.totalProtein}g</div>
                    </div>
                    <div className="bg-surface-muted border border-surface-line p-3 rounded-2xl text-center">
                      <div className="text-xs text-ink-2 mb-1">Fat</div>
                      <div className="text-lg font-black text-brand">{activeAnalysis.totalFat}g</div>
                    </div>
                    <div className="bg-surface-muted border border-surface-line p-3 rounded-2xl text-center">
                      <div className="text-xs text-ink-2 mb-1">Fiber</div>
                      <div className="text-lg font-black text-blue">{activeAnalysis.totalFiber}g</div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveMeal}
                    className="w-full py-4 bg-txt text-white rounded-xl font-bold hover:bg-txt-2 transition-all shadow-custom flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Log Meal
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
