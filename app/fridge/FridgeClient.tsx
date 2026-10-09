"use client";

import React, { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import GroceryListModal from '@/components/GroceryListModal';
import { Camera, Refrigerator, Upload, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Utensils } from 'lucide-react';
import { analyzeFridgeImageAction, addIngredientsToGroceryListAction } from "@/app/actions";
import { compressImageFile } from "@/lib/imageCompress";
import { enqueueOp } from "@/lib/offlineQueue";
import { useOfflineSync, useOnline } from "@/lib/useOfflineSync";
import OfflineStatusBar, { showToast } from "@/components/OfflineStatusBar";
import { loadFridgeResult, clearFridgeResult } from "@/lib/fridgeResults";
import { motion, AnimatePresence } from 'framer-motion';

interface Recipe {
  name: string;
  description: string;
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
  sodium: number;
  iron: number;
  calcium: number;
  tags: string[];
  veg: boolean;
  vegan: boolean;
  sodiumHigh: boolean;
  matchStatus: 'perfect' | 'warn' | 'dim';
  steps: string[];
  ingredients_used: string[];
}

export default function FridgeClient({ userId, accountUserId }: { userId: string; accountUserId: string }) {
  const online = useOnline();
  const offlineSync = useOfflineSync(accountUserId);
  const [fromBackground, setFromBackground] = useState(false);
  const waitingPhotos = offlineSync.pending.filter((o) => o.kind === "fridge_photo" && o.userId === userId).length;
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGroceryOpen, setIsGroceryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ingredients: string[], recipes: Recipe[] } | null>(null);
  const [expandedRecipeIdx, setExpandedRecipeIdx] = useState<number | null>(null);
  const [addingGrocery, setAddingGrocery] = useState<number | null>(null);
  const [fCoachIdx, setFCoachIdx] = useState(0);

  const coachMessages = [
    "Your protein is low today. I've flagged a few high-protein options for you.",
    "Remember to watch your sodium levels!",
    "Looking for a quick snack? Check the vegetarian bowl."
  ];

  React.useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        setFCoachIdx((prev) => (prev + 1) % coachMessages.length);
      }, 4200);
      return () => clearInterval(interval);
    }
  }, [step, coachMessages.length]);

  // Recipes generated in the background (photo taken offline) wait on the device until opened.
  const showSavedResult = React.useCallback(() => {
    const saved = loadFridgeResult(userId);
    if (saved) {
      setResult(saved.result as any);
      setFromBackground(true);
      setError(null);
      setStep(2);
    }
  }, [userId]);
  React.useEffect(() => {
    showSavedResult();
    window.addEventListener("nura:fridge-ready", showSavedResult);
    return () => window.removeEventListener("nura:fridge-ready", showSavedResult);
  }, [showSavedResult]);

  const queueFridgePhoto = async () => {
    if (!base64Image) return;
    try {
      await enqueueOp({ userId, ownerId: accountUserId, kind: "fridge_photo", eatenAt: Date.now(), image: base64Image });
      showToast("Photo saved — recipes will be ready when you're back online");
      setSelectedImage(null);
      setBase64Image(null);
    } catch (e: any) {
      setError(e?.message || "Couldn't save the photo on this device.");
      setStep(2);
    }
  };

  const handleAddGrocery = async (idx: number, ingredients: string[]) => {
    if (!ingredients || ingredients.length === 0) return;
    setAddingGrocery(idx);
    const res = await addIngredientsToGroceryListAction(ingredients);
    setAddingGrocery(null);
    if (res.success) {
      alert((res.added ?? 0) > 0 ? `Added ${res.added} new items to Grocery List!` : "All items already in your list!");
    } else {
      alert("Failed to add items: " + res.error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setBase64Image(null);
      setError(null);
      compressImageFile(file)
        .then(setBase64Image)
        .catch((err) => {
          setSelectedImage(null);
          setError(err?.message || "Could not read that image. Try another photo.");
        });
    }
    e.target.value = "";
  };

  const handleStartAnalysis = async () => {
    if (!base64Image || isAnalyzing) return;
    setStep(1);
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await Promise.race([
        analyzeFridgeImageAction(base64Image),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 60000)),
      ]);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || "Failed to analyze your fridge.");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "timeout"
          ? "That took too long. Check your connection and try again."
          : typeof navigator !== "undefined" && !navigator.onLine
            ? "You're offline. Reconnect and try again."
            : "Something went wrong. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-40">
      <OfflineStatusBar sync={offlineSync} />
      <div className="pt-16 px-6 max-w-lg mx-auto space-y-8">
        
        {/* Header Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="text-[10px] font-black tracking-widest text-ink-soft uppercase mb-1">
                AI Recipes
              </div>
              <h1 className="text-3xl font-black tracking-tight text-ink">
                Fridge Raider
              </h1>
            </div>
            <button
              onClick={() => setIsGroceryOpen(true)}
              className="p-3 bg-brand-50 hover:bg-brand-100 text-brand rounded-2xl transition-all border border-brand-500/20 shadow-sm"
              title="View Grocery List"
            >
              <Utensils className="w-6 h-6" />
            </button>
          </div>

          {/* Main Card */}
          <div className="bg-gradient-to-br from-white via-white to-emerald-50 rounded-[40px] p-8 shadow-sm border border-surface-line text-center relative overflow-hidden">
            {/* Decorative blur */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/40 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand/10 rounded-full blur-3xl"></div>
            
            <div className="w-16 h-16 bg-[#fff1ec] rounded-[20px] border border-[#ffdfd4] flex items-center justify-center mx-auto mb-6 relative z-10 shadow-sm">
              <Refrigerator className="w-8 h-8 text-brand" />
            </div>
            
            <h2 className="text-xl font-black text-ink mb-3 relative z-10">What's in your fridge?</h2>
            <p className="text-sm font-medium text-ink-soft leading-relaxed relative z-10 px-2">
              Snap a photo and Buddy invents macro-friendly recipes from what it sees.
            </p>
          </div>
        </div>

        {/* Steps Guide - Only show when step === 0 and no image selected */}
        {step === 0 && !selectedImage && (
          <div className="space-y-4">
            <div className="bg-white border border-surface-line rounded-[20px] p-5 flex items-center gap-4 shadow-sm">
              <div className="w-8 h-8 bg-brand/10 text-brand rounded-[12px] flex items-center justify-center font-black text-sm shrink-0">1</div>
              <span className="font-medium text-ink text-sm">Open the fridge door wide</span>
            </div>
            
            <div className="bg-white border border-surface-line rounded-[20px] p-5 flex items-center gap-4 shadow-sm">
              <div className="w-8 h-8 bg-emerald-500/10 text-emerald-600 rounded-[12px] flex items-center justify-center font-black text-sm shrink-0">2</div>
              <span className="font-medium text-ink text-sm">Capture shelves and produce drawer</span>
            </div>
            
            <div className="bg-white border border-surface-line rounded-[20px] p-5 flex items-center gap-4 shadow-sm">
              <div className="w-8 h-8 bg-amber-500/10 text-amber-600 rounded-[12px] flex items-center justify-center font-black text-sm shrink-0">3</div>
              <span className="font-medium text-ink text-sm">Buddy returns 3 macro-balanced recipes</span>
            </div>
          </div>
        )}

        {/* Action Area (replaces the old modal) */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* STEP 0: Upload */}
          {step === 0 && waitingPhotos > 0 && (
            <div className="mb-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 px-4 py-3 text-sm font-medium">
              {waitingPhotos === 1 ? "1 fridge photo is" : `${waitingPhotos} fridge photos are`} waiting. Recipes will appear here as soon as you&apos;re back online.
            </div>
          )}
          {step === 0 && (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              {!selectedImage ? (
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  {/* Upload Zone */}
                  <div className="relative border-2 border-dashed border-surface-line hover:border-brand-500/60 transition-all rounded-[28px] bg-white p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-4 group h-56 shadow-sm">
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
                      <p className="text-base font-bold text-ink group-hover:text-ink transition-all">Upload</p>
                      <p className="text-[10px] sm:text-xs text-ink-faint mt-1">From gallery</p>
                    </div>
                  </div>

                  {/* Camera Zone */}
                  <div className="relative border-2 border-dashed border-surface-line hover:border-emerald-500/60 transition-all rounded-[28px] bg-white p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-4 group h-56 shadow-sm">
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
                      <p className="text-base font-bold text-ink group-hover:text-ink transition-all">Camera</p>
                      <p className="text-[10px] sm:text-xs text-ink-faint mt-1">Take a photo</p>
                    </div>
                  </div>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-surface-line rounded-3xl p-4 flex flex-col md:flex-row items-center gap-6 shadow-sm"
                >
                  <img src={selectedImage} className="w-24 h-24 object-cover rounded-2xl border border-surface-line shadow-lg" alt="Preview" />
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-sm font-bold text-ink mb-1">Image Loaded!</h4>
                    <p className="text-xs text-ink-soft">Ready to raid your fridge.</p>
                  </div>
                  <button
                    onClick={online ? handleStartAnalysis : queueFridgePhoto}
                    disabled={!base64Image}
                    className="px-8 py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-600/30 flex items-center gap-2 w-full md:w-auto justify-center text-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    {online ? "Generate Recipes" : "Save for when I'm online"}
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* STEP 1: Scanning Animation */}
          {step === 1 && selectedImage && (
             <div className="flex flex-col items-center justify-center py-12 space-y-10">
               <div className="relative w-full max-w-sm h-64 rounded-[32px] overflow-hidden border border-surface-line shadow-xl bg-white">
                 <img src={selectedImage} alt="Scanning..." className="w-full h-full object-cover opacity-60" />
                 <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                 
                 {/* Scanning beam */}
                 <motion.div 
                   className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.9)]"
                   animate={{ top: ["0%", "100%", "0%"] }}
                   transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                 />
               </div>

               <div className="text-center space-y-3 bg-white p-6 rounded-[24px] border border-surface-line shadow-sm w-full">
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
            <div className="space-y-8">
              {error ? (
                <div className="p-8 bg-white rounded-3xl border border-red-500/20 text-center space-y-5 shadow-sm">
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
                  {fromBackground && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm font-medium flex items-center justify-between gap-3">
                      <span>Made from the photo you saved while offline.</span>
                      <button
                        onClick={() => { clearFridgeResult(userId); setFromBackground(false); setResult(null); setSelectedImage(null); setBase64Image(null); setStep(0); }}
                        className="shrink-0 font-bold underline"
                      >
                        Scan again
                      </button>
                    </div>
                  )}
                  
                  {/* Ingredients Bar */}
                  <div className="bg-white border border-surface-line rounded-[24px] p-5 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                    <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-ink-faint uppercase tracking-widest mb-2 text-center md:text-left">Detected Ingredients</h4>
                      <div className="flex flex-wrap justify-center md:justify-start gap-2">
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
                    
                    {/* Live Coach Nudge */}
                    <div className="mb-6 bg-white border border-surface-line rounded-[24px] p-5 shadow-sm flex gap-4 items-center">
                      <div className="w-10 h-10 bg-[#fff1ec] rounded-full flex flex-shrink-0 items-center justify-center relative">
                        <Sparkles className="w-5 h-5 text-brand" />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-[9px] font-black tracking-widest text-emerald-600 uppercase mb-1">Live Coach</div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={fCoachIdx}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm font-medium text-ink-soft leading-tight"
                          >
                            {coachMessages[fCoachIdx]}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {result.recipes.map((recipe, idx) => (
                        <div key={idx} className={`bg-white border ${recipe.matchStatus === 'warn' ? 'border-amber-300 shadow-amber-500/10' : 'border-surface-line'} rounded-3xl overflow-hidden transition-all flex flex-col group shadow-sm ${recipe.matchStatus === 'dim' ? 'opacity-60 grayscale-[0.2]' : ''}`}>
                          
                          {/* Recipe Flags */}
                          {recipe.matchStatus === 'warn' && (
                            <div className="bg-amber-100 px-4 py-2 flex items-center justify-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Medical Warning: High Sodium</span>
                            </div>
                          )}
                          {recipe.matchStatus === 'dim' && (
                            <div className="bg-surface-line px-4 py-2 flex items-center justify-center gap-2">
                              <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">Diet Mismatch</span>
                            </div>
                          )}

                          {/* Recipe Header */}
                          <div className="p-6 border-b border-surface-line space-y-3 relative">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {recipe.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-brand-50 text-brand rounded text-[9px] font-black uppercase tracking-wider">{tag}</span>
                              ))}
                              {recipe.vegan && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-wider">Vegan</span>}
                            </div>
                            
                            <h4 className="text-base font-bold text-ink leading-tight">{recipe.name}</h4>
                            <p className="text-xs text-ink-soft">{recipe.description}</p>
                            
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
                              className="w-full p-5 flex items-center justify-between text-xs font-bold text-ink-soft hover:text-brand transition-colors"
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
                                  <div className="p-5 space-y-4 bg-surface-muted">
                                    {/* Full Breakdown Micros Grid */}
                                    <div>
                                      <h5 className="text-[10px] font-black text-ink-faint uppercase tracking-widest mb-3">Full Breakdown</h5>
                                      <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                                          <div className={`text-sm font-black leading-tight ${recipe.sodiumHigh ? 'text-amber-500' : 'text-ink'}`}>{recipe.sodium}mg</div>
                                          <div className="text-[8px] font-bold text-ink-soft uppercase mt-0.5">Sodium</div>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                                          <div className="text-sm font-black text-ink leading-tight">{recipe.iron}mg</div>
                                          <div className="text-[8px] font-bold text-ink-soft uppercase mt-0.5">Iron</div>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 border border-surface-line text-center">
                                          <div className="text-sm font-black text-ink leading-tight">{recipe.calcium}mg</div>
                                          <div className="text-[8px] font-bold text-ink-soft uppercase mt-0.5">Calcium</div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {recipe.steps.map((stepStr, sIdx) => (
                                      <div key={sIdx} className="flex gap-3 bg-white p-4 rounded-2xl shadow-sm border border-surface-line">
                                        <div className="w-6 h-6 rounded-full bg-brand-100 text-brand flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                          {sIdx + 1}
                                        </div>
                                        <p className="text-xs text-ink-soft leading-relaxed pt-1">{stepStr}</p>
                                      </div>
                                    ))}
                                    {recipe.ingredients_used && recipe.ingredients_used.length > 0 && (
                                      <div className="mt-4 border-t border-surface-line pt-4">
                                        <h5 className="text-[10px] font-black text-ink-faint uppercase tracking-widest mb-2">Ingredients Used</h5>
                                        <ul className="list-disc pl-5 space-y-1 mb-4">
                                          {recipe.ingredients_used.map((item, i) => (
                                            <li key={i} className="text-xs text-ink-soft">{item}</li>
                                          ))}
                                        </ul>
                                        <button 
                                          onClick={() => handleAddGrocery(idx, recipe.ingredients_used)}
                                          disabled={addingGrocery === idx}
                                          className="w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-indigo-500/20 shadow-sm"
                                        >
                                          {addingGrocery === idx ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Sparkles className="w-4 h-4" />
                                          )}
                                          <span>Add Missing to Grocery List</span>
                                        </button>
                                      </div>
                                    )}
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
                      className="px-6 py-3 bg-white shadow-sm border border-surface-line hover:border-brand-300 text-brand font-bold text-sm rounded-xl transition-all"
                    >
                      Raid Another Fridge
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </div>
      </div>

      <BottomNav />
      {isGroceryOpen && (
        <GroceryListModal 
          onClose={() => setIsGroceryOpen(false)} 
        />
      )}
    </div>
  );
}
