"use client";

import React, { useState } from 'react';
import { Camera, Upload, X, ChevronRight, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Check, Sparkles, Utensils } from 'lucide-react';
import { analyzeFridgeImageAction } from "@/app/actions";
import { motion, AnimatePresence } from 'framer-motion';

interface Recipe {
  name: string;
  prep_time_min: number;
  servings: number;
  difficulty: string;
  macros_per_serving: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
  };
  ingredients_used: string[];
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
  const [result, setResult] = useState<{ ingredients_found: string[], recipes: Recipe[] } | null>(null);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-bg/85 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-bg border border rounded-[32px] shadow-2xl flex flex-col relative max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border/80 sticky top-0 bg-bg/90 backdrop-blur-md z-10 rounded-t-[32px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-txt tracking-tight">AI Fridge Raider</h3>
              <p className="text-xs text-txt-2">Generate macro-friendly recipes from your ingredients.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-txt-2 hover:text-txt rounded-xl bg-card hover:bg-col transition-all focus:ring-2 focus:ring-indigo-500"
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
                <div className="relative border-2 border-dashed border-s hover:border-indigo-500/60 transition-all rounded-[28px] bg-card/40 p-8 text-center flex flex-col items-center justify-center gap-4 group h-56">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-col flex items-center justify-center border border-s text-txt-2 group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-all shadow-md">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-200 group-hover:text-txt transition-all">Upload Photo</p>
                    <p className="text-xs text-txt-h mt-1">From your gallery</p>
                  </div>
                </div>

                {/* Camera Zone */}
                <div className="relative border-2 border-dashed border-s hover:border-emerald-500/60 transition-all rounded-[28px] bg-card/40 p-8 text-center flex flex-col items-center justify-center gap-4 group h-56">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-col flex items-center justify-center border border-s text-txt-2 group-hover:bg-green/10 group-hover:text-green transition-all shadow-md">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-200 group-hover:text-txt transition-all">Take Photo</p>
                    <p className="text-xs text-txt-h mt-1">Snap inside your fridge</p>
                  </div>
                </div>
              </div>

              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border rounded-3xl p-4 flex flex-col md:flex-row items-center gap-6"
                >
                  <img src={selectedImage} className="w-24 h-24 object-cover rounded-2xl border border-s shadow-lg" alt="Preview" />
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-sm font-bold text-txt mb-1">Image Loaded!</h4>
                    <p className="text-xs text-txt-2">Ready to raid your fridge.</p>
                  </div>
                  <button
                    onClick={handleStartAnalysis}
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-txt font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 w-full md:w-auto justify-center"
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
               <div className="relative w-80 h-64 rounded-[32px] overflow-hidden border border-s shadow-2xl shadow-indigo-500/10 bg-card">
                 <img src={selectedImage} alt="Scanning..." className="w-full h-full object-cover opacity-60" />
                 <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                 
                 {/* Scanning beam */}
                 <motion.div 
                   className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.9)]"
                   animate={{ top: ["0%", "100%", "0%"] }}
                   transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                 />
               </div>

               <div className="text-center space-y-3">
                 <div className="flex items-center justify-center gap-2 text-indigo-400">
                   <RefreshCw className="w-5 h-5 animate-spin" />
                   <span className="font-black tracking-widest uppercase text-sm">Analyzing Ingredients</span>
                 </div>
                 <p className="text-xs text-txt-h">Drafting Michelin-star macro recipes...</p>
               </div>
             </div>
          )}

          {/* STEP 2: Results */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {error ? (
                <div className="p-8 bg-card rounded-3xl border border-red-500/20 text-center space-y-5 max-w-lg mx-auto">
                  <div className="w-16 h-16 rounded-full bg-red/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-txt">Analysis Failed</h4>
                    <p className="text-sm text-txt-2 mt-2">{error}</p>
                  </div>
                  <button
                    onClick={() => setStep(0)}
                    className="px-6 py-3 bg-col hover:bg-input text-sm font-semibold rounded-xl text-txt transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : result ? (
                <div className="space-y-8">
                  
                  {/* Ingredients Bar */}
                  <div className="bg-card border border rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center">
                    <div className="bg-bg p-3 rounded-2xl border border flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-green" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-txt-h uppercase tracking-widest mb-1">Detected Ingredients</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.ingredients_found.map((ing, i) => (
                          <span key={i} className="px-3 py-1 bg-col text-txt-2 rounded-lg text-xs font-semibold border border-s/50">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recipes Grid */}
                  <div>
                    <h3 className="text-lg font-black text-txt mb-4 px-1">Generated Recipes</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {result.recipes.map((recipe, idx) => (
                        <div key={idx} className="bg-card border border hover:border-indigo-500/40 rounded-3xl overflow-hidden transition-all flex flex-col group shadow-lg">
                          {/* Recipe Header */}
                          <div className="p-6 border-b border space-y-3 flex-1">
                            <h4 className="text-base font-bold text-txt leading-tight">{recipe.name}</h4>
                            <div className="flex gap-2 text-[10px] font-bold text-txt-2 pt-1">
                              <span className="bg-col px-2 py-1 rounded-md border border-s">{recipe.prep_time_min} mins</span>
                              <span className="bg-col px-2 py-1 rounded-md border border-s">{recipe.servings} serving(s)</span>
                              <span className="bg-col px-2 py-1 rounded-md border border-s capitalize">{recipe.difficulty}</span>
                            </div>
                            
                            {/* Macros */}
                            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border/50">
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-txt-h">Cals</p>
                                <p className="text-sm font-bold text-txt mt-0.5">{recipe.macros_per_serving.calories}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-green">Pro</p>
                                <p className="text-sm font-bold text-green mt-0.5">{recipe.macros_per_serving.protein_g}g</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-orange">Fat</p>
                                <p className="text-sm font-bold text-orange mt-0.5">{recipe.macros_per_serving.fat_g}g</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-blue">Carb/Fib</p>
                                <p className="text-xs font-bold text-blue mt-1">{recipe.macros_per_serving.carbs_g}g / {recipe.macros_per_serving.fiber_g}g</p>
                              </div>
                            </div>
                          </div>

                          {/* Accordion Steps */}
                          <div className="bg-bg">
                            <button 
                              onClick={() => setExpandedRecipeIdx(expandedRecipeIdx === idx ? null : idx)}
                              className="w-full p-4 flex items-center justify-between text-xs font-bold text-txt-2 hover:text-indigo-400 transition-colors"
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
                                  className="overflow-hidden border-t border"
                                >
                                  <div className="p-5 space-y-4 bg-card/50">
                                    <div>
                                      <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Ingredients</h5>
                                      <ul className="list-disc pl-4 space-y-1">
                                        {recipe.ingredients_used.map((item, i) => (
                                          <li key={i} className="text-xs text-txt-2">{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <h5 className="text-[10px] font-black text-green uppercase tracking-widest mb-2 mt-4">Steps</h5>
                                      <div className="space-y-3">
                                        {recipe.steps.map((stepStr, sIdx) => (
                                          <div key={sIdx} className="flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                              {sIdx + 1}
                                            </div>
                                            <p className="text-xs text-txt-2 leading-relaxed">{stepStr}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
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
                      className="px-6 py-2.5 bg-col hover:bg-input text-txt-2 font-semibold text-sm rounded-xl transition-all"
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
