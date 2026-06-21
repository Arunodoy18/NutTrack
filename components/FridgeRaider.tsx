"use client";

import React, { useState } from 'react';
import { Camera, Upload, X, ChevronRight, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Check, Sparkles, Utensils } from 'lucide-react';
import { analyzeFridgeImageAction } from "@/app/actions";
import { motion, AnimatePresence } from 'framer-motion';

interface Recipe {
  name: string;
  description: string;
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
  steps: string[];
}

interface FridgeRaiderProps {
  onClose: () => void;
}

export default function FridgeRaider({ onClose }: FridgeRaiderProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ingredients: string[], recipes: Recipe[] } | null>(null);
  const [expandedRecipeIdx, setExpandedRecipeIdx] = useState<number | null>(null);

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
    setStep(1);
    setIsAnalyzing(true);
    setError(null);

    const res = await analyzeFridgeImageAction(base64Image);
    setIsAnalyzing(false);

    if (res.success && res.data) {
      setResult(res.data);
      setStep(2);
    } else {
      setError(res.error || "Failed to analyze your fridge.");
      setStep(2);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-white border border-surface-line rounded-[32px] shadow-2xl flex flex-col relative max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-surface-line/80 sticky top-0 bg-white/90 backdrop-blur-md z-10 rounded-t-[32px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-500/20 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-ink tracking-tight">AI Fridge Raider</h3>
              <p className="text-xs text-ink-soft">Generate macro-friendly recipes from your ingredients.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-ink-soft hover:text-ink rounded-xl bg-white hover:bg-surface-muted transition-all focus:ring-2 focus:ring-brand-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* STEP 0: Upload */}
          {step === 0 && (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Upload Zone */}
                <div className="relative border-2 border-dashed border-surface-line hover:border-brand-500/60 transition-all rounded-[28px] bg-surface-muted p-8 text-center flex flex-col items-center justify-center gap-4 group h-56">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center border border-surface-line text-ink-soft group-hover:bg-brand-50 group-hover:text-brand transition-all shadow-md">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-ink group-hover:text-ink transition-all">Upload Photo</p>
                    <p className="text-xs text-ink-faint mt-1">From your gallery</p>
                  </div>
                </div>

                {/* Camera Zone */}
                <div className="relative border-2 border-dashed border-surface-line hover:border-emerald-500/60 transition-all rounded-[28px] bg-surface-muted p-8 text-center flex flex-col items-center justify-center gap-4 group h-56">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center border border-surface-line text-ink-soft group-hover:bg-emerald-600/10 group-hover:text-emerald-600 transition-all shadow-md">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-ink group-hover:text-ink transition-all">Take Photo</p>
                    <p className="text-xs text-ink-faint mt-1">Snap inside your fridge</p>
                  </div>
                </div>
              </div>

              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-surface-line rounded-3xl p-4 flex flex-col md:flex-row items-center gap-6"
                >
                  <img src={selectedImage} className="w-24 h-24 object-cover rounded-2xl border border-surface-line shadow-lg" alt="Preview" />
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-sm font-bold text-ink mb-1">Image Loaded!</h4>
                    <p className="text-xs text-ink-soft">Ready to raid your fridge.</p>
                  </div>
                  <button
                    onClick={handleStartAnalysis}
                    className="px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-600/30 flex items-center gap-2 w-full md:w-auto justify-center"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Recipes
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* STEP 1: Scanning Animation */}
          {step === 1 && selectedImage && (
             <div className="flex flex-col items-center justify-center py-12 space-y-10">
               <div className="relative w-80 h-64 rounded-[32px] overflow-hidden border border-surface-line shadow-2xl shadow-brand-500/10 bg-white">
                 <img src={selectedImage} alt="Scanning..." className="w-full h-full object-cover opacity-60" />
                 <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                 
                 {/* Scanning beam */}
                 <motion.div 
                   className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.9)]"
                   animate={{ top: ["0%", "100%", "0%"] }}
                   transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                 />
               </div>

               <div className="text-center space-y-3">
                 <div className="flex items-center justify-center gap-2 text-brand">
                   <RefreshCw className="w-5 h-5 animate-spin" />
                   <span className="font-black tracking-widest uppercase text-sm">Analyzing Ingredients</span>
                 </div>
                 <p className="text-xs text-ink-faint">Drafting Michelin-star macro recipes...</p>
               </div>
             </div>
          )}

          {/* STEP 2: Results */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {error ? (
                <div className="p-8 bg-white rounded-3xl border border-red-500/20 text-center space-y-5 max-w-lg mx-auto">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto border border-red-500/20">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-display text-lg font-bold text-ink">Analysis Failed</h4>
                    <p className="text-sm text-ink-soft mt-2">{error}</p>
                  </div>
                  <button
                    onClick={() => setStep(0)}
                    className="px-6 py-3 bg-surface-muted hover:bg-surface-line text-sm font-semibold rounded-xl text-ink transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : result ? (
                <div className="space-y-8">
                  
                  {/* Ingredients Bar */}
                  <div className="bg-white border border-surface-line rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center">
                    <div className="bg-white p-3 rounded-2xl border border-surface-line flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-ink-faint uppercase tracking-widest mb-1">Detected Ingredients</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.ingredients.map((ing, i) => (
                          <span key={i} className="px-3 py-1 bg-surface-muted text-ink-soft rounded-lg text-xs font-semibold border border-surface-line">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recipes Grid */}
                  <div>
                    <h3 className="text-lg font-black text-ink mb-4 px-1">Generated Recipes</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {result.recipes.map((recipe, idx) => (
                        <div key={idx} className="bg-white border border-surface-line hover:border-brand-500/40 rounded-3xl overflow-hidden transition-all flex flex-col group shadow-lg">
                          {/* Recipe Header */}
                          <div className="p-6 border-b border-surface-line space-y-3 flex-1">
                            <h4 className="text-base font-bold text-ink leading-tight">{recipe.name}</h4>
                            <p className="text-xs text-ink-soft line-clamp-2">{recipe.description}</p>
                            
                            {/* Macros */}
                            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-surface-line">
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-ink-faint">Cals</p>
                                <p className="text-sm font-bold text-ink mt-0.5">{recipe.calories}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-emerald-500">Pro</p>
                                <p className="text-sm font-bold text-emerald-600 mt-0.5">{recipe.protein}g</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-amber-600">Fat</p>
                                <p className="text-sm font-bold text-amber-600 mt-0.5">{recipe.fat}g</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-blue-500">Carb/Fib</p>
                                <p className="text-sm font-bold text-blue-600 mt-0.5">{recipe.fiber}g</p>
                              </div>
                            </div>
                          </div>

                          {/* Accordion Steps */}
                          <div className="bg-white">
                            <button 
                              onClick={() => setExpandedRecipeIdx(expandedRecipeIdx === idx ? null : idx)}
                              className="w-full p-4 flex items-center justify-between text-xs font-bold text-ink-soft hover:text-brand transition-colors"
                            >
                              <span>View Cooking Steps</span>
                              {expandedRecipeIdx === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            
                            <AnimatePresence>
                              {expandedRecipeIdx === idx && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-t border-surface-line"
                                >
                                  <div className="p-5 space-y-3 bg-surface-muted">
                                    {recipe.steps.map((stepStr, sIdx) => (
                                      <div key={sIdx} className="flex gap-3">
                                        <div className="w-5 h-5 rounded-full bg-brand-100 text-brand flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                          {sIdx + 1}
                                        </div>
                                        <p className="text-xs text-ink-soft leading-relaxed">{stepStr}</p>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => {
                        setStep(0);
                        setSelectedImage(null);
                        setBase64Image(null);
                      }}
                      className="px-6 py-2.5 bg-surface-muted hover:bg-surface-line text-ink-soft font-semibold text-sm rounded-xl transition-all"
                    >
                      Raid Another Fridge
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
