"use client";

import React, { useState, useEffect } from 'react';
import { 
  Flame, Activity, Plus, RefreshCw, Calendar, Settings, Check, 
  AlertTriangle, Sparkles, X, Camera, Upload, Zap, Mic, MicOff, 
  Utensils, ShoppingCart, Bot, LogOut, Trash2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { saveDailyGoalsAction, saveMealAction, analyzeMealTextAction, analyzeMealImageAction, generateNutritionInsightAction } from "@/app/actions";
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from "next-auth/react";
import { useSpeech } from "@/components/useSpeech";
import FridgeRaider from "@/components/FridgeRaider";
import GroceryListModal from '@/components/GroceryListModal';
import AIChatModal from '@/components/AIChatModal';
import Paywall from '@/components/Paywall';

// Interfaces
export interface FoodItemData { id: string; name: string; calories: number; protein: number; fat: number; fiber: number; estimatedQuantity: string; }
export interface MealLogData { id: string; timestamp: string; summary: string; totalCalories: number; totalProtein: number; totalFat: number; totalFiber: number; items: FoodItemData[]; }
export interface DashboardProps { userId?: string; isPremiumUser?: boolean; dailyGoals: any; todayTotals: any; todayMeals: MealLogData[]; onAddMealClick?: () => void; onRefreshClick?: () => void; activeStreak?: number; totalMealsCount?: number; weeklyData?: any[]; }

export default function Dashboard({
  userId = "guest", isPremiumUser = false,
  dailyGoals = { calories: 2000, protein: 80, fat: 65, fiber: 30 },
  todayTotals = { calories: 0, protein: 0, fat: 0, fiber: 0 },
  todayMeals = [], onAddMealClick, onRefreshClick, activeStreak = 1, weeklyData = [],
}: DashboardProps) {
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFridgeRaiderOpen, setIsFridgeRaiderOpen] = useState(false);
  const [isGroceryListOpen, setIsGroceryListOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'Calories' | 'Protein' | 'Fats' | 'Fiber'>('Calories');

  const [targetCals, setTargetCals] = useState(dailyGoals.calories.toString());
  const [targetProtein, setTargetProtein] = useState(dailyGoals.protein.toString());
  const [targetFat, setTargetFat] = useState(dailyGoals.fat.toString());
  const [targetFiber, setTargetFiber] = useState(dailyGoals.fiber.toString());
  const [isSaving, setIsSaving] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [customMealName, setCustomMealName] = useState("");
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [scanningMsgIdx, setScanningMsgIdx] = useState(0);

  const { isListening, transcript, startListening, stopListening, error: speechError } = useSpeech();

  useEffect(() => { setIsPremium(isPremiumUser || localStorage.getItem("dietbuddy_premium") === "true"); }, [isPremiumUser]);

  const checkScanLimit = () => {
    if (typeof window === "undefined" || isPremium) return false;
    const count = parseInt(localStorage.getItem("dietbuddy_scan_count") || "0");
    return count >= 3;
  };

  const incrementScanCount = () => {
    const count = parseInt(localStorage.getItem("dietbuddy_scan_count") || "0");
    localStorage.setItem("dietbuddy_scan_count", (count + 1).toString());
  };

  const SCAN_MESSAGES = ["Detecting ingredients...", "Estimating portions...", "Calculating macros..."];

  const FOOD_PRESETS = [
    { id: "preset-1", name: "Salmon Bowl", icon: "🥗", totalCalories: 620, totalProtein: 42, totalFat: 22, totalFiber: 8, items: [] },
    { id: "preset-2", name: "Avocado Salad", icon: "🥑", totalCalories: 450, totalProtein: 18, totalFat: 31, totalFiber: 12, items: [] },
    { id: "preset-3", name: "Chicken Plate", icon: "🍗", totalCalories: 540, totalProtein: 35, totalFat: 8, totalFiber: 4, items: [] }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (uploadStep === 1) {
      interval = setInterval(() => {
        setScanningMsgIdx(p => p < 2 ? p + 1 : p);
      }, 950);
    }
    return () => clearInterval(interval);
  }, [uploadStep, isAnalyzing]);

  useEffect(() => {
    if (uploadStep === 1 && !isAnalyzing && activeAnalysis && scanningMsgIdx === 2) setUploadStep(2);
  }, [isAnalyzing, activeAnalysis, uploadStep, scanningMsgIdx]);

  useEffect(() => {
    if (!isListening && transcript.trim().length > 0 && uploadStep === 0) runVoiceAnalysis(transcript);
  }, [isListening, transcript]);

  const runAiAnalysis = async (b64: string) => {
    setIsAnalyzing(true); setAnalysisError(null);
    try {
      const res = await analyzeMealImageAction(b64);
      if (res.success && res.analysis) { setActiveAnalysis(res.analysis); setCustomMealName(res.analysis.name); incrementScanCount(); }
      else setAnalysisError(res.error || "Failed");
    } catch { setAnalysisError("Error"); } finally { setIsAnalyzing(false); }
  };

  const runVoiceAnalysis = async (text: string) => {
    if (checkScanLimit()) return setIsPaywallOpen(true);
    setUploadStep(1); setIsAnalyzing(true); setAnalysisError(null);
    try {
      const res = await analyzeMealTextAction(text);
      if (res.success && res.analysis) { setActiveAnalysis(res.analysis); setCustomMealName(res.analysis.name); incrementScanCount(); }
      else setAnalysisError(res.error || "Failed");
    } catch { setAnalysisError("Error"); } finally { setIsAnalyzing(false); }
  };

  // --- Edit & Confirm Logic ---
  const handleItemChange = (index: number, field: string, value: string | number) => {
    if (!activeAnalysis || !activeAnalysis.items) return;
    const newItems = [...activeAnalysis.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setActiveAnalysis({ ...activeAnalysis, items: newItems });
  };

  const handleItemDelete = (index: number) => {
    if (!activeAnalysis || !activeAnalysis.items) return;
    const newItems = activeAnalysis.items.filter((_: any, i: number) => i !== index);
    setActiveAnalysis({ ...activeAnalysis, items: newItems });
  };

  const handleAddItem = () => {
    if (!activeAnalysis) return;
    const newItems = [...(activeAnalysis.items || []), { name: "", calories: 0, protein: 0, fat: 0, fiber: 0, estimatedQuantity: "100g" }];
    setActiveAnalysis({ ...activeAnalysis, items: newItems });
  };

  useEffect(() => {
    if (activeAnalysis && activeAnalysis.items) {
      const items = activeAnalysis.items;
      const totalCalories = items.reduce((sum: number, item: any) => sum + (item.calories || 0), 0);
      const totalProtein = items.reduce((sum: number, item: any) => sum + (item.protein || 0), 0);
      const totalFat = items.reduce((sum: number, item: any) => sum + (item.fat || 0), 0);
      const totalFiber = items.reduce((sum: number, item: any) => sum + (item.fiber || 0), 0);
      
      if (
        totalCalories !== activeAnalysis.totalCalories ||
        totalProtein !== activeAnalysis.totalProtein ||
        totalFat !== activeAnalysis.totalFat ||
        totalFiber !== activeAnalysis.totalFiber
      ) {
        setActiveAnalysis({ ...activeAnalysis, totalCalories, totalProtein, totalFat, totalFiber });
      }
    }
  }, [activeAnalysis?.items]);

  const handleStartAnalysis = () => {
    if (checkScanLimit()) return setIsPaywallOpen(true);
    setUploadStep(1); if (base64Image) runAiAnalysis(base64Image);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file)); setCustomMealName("Scanned Image"); setAnalysisError(null); setActiveAnalysis(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
             setBase64Image(compressedBase64);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMeal = async () => {
    if (!activeAnalysis) return;
    setIsSavingMeal(true);
    const res = await saveMealAction(userId, { summary: customMealName, totalCalories: activeAnalysis.totalCalories, totalProtein: activeAnalysis.totalProtein, totalFat: activeAnalysis.totalFat, totalFiber: activeAnalysis.totalFiber, items: activeAnalysis.items || [] });
    setIsSavingMeal(false);
    if (res.success) { setIsUploadModalOpen(false); setSelectedImage(null); setActiveAnalysis(null); }
  };

  // Math
  const calPercent = dailyGoals.calories > 0 ? Math.min(100, Math.round((todayTotals.calories / dailyGoals.calories) * 100)) : 0;
  const protPercent = dailyGoals.protein > 0 ? Math.min(100, Math.round((todayTotals.protein / dailyGoals.protein) * 100)) : 0;
  const fatPercent = dailyGoals.fat > 0 ? Math.min(100, Math.round((todayTotals.fat / dailyGoals.fat) * 100)) : 0;
  const fibPercent = dailyGoals.fiber > 0 ? Math.min(100, Math.round((todayTotals.fiber / dailyGoals.fiber) * 100)) : 0;
  const isOverCal = todayTotals.calories > dailyGoals.calories;

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    await saveDailyGoalsAction(userId, { calories: parseInt(targetCals), protein: parseInt(targetProtein), fat: parseInt(targetFat), fiber: parseInt(targetFiber) });
    setIsSaving(false); setIsModalOpen(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F7F5F0] text-[#3D3B38] font-sans pb-32">
      {/* FLOATING ACTION BAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
        <button onClick={() => { setIsUploadModalOpen(true); setUploadStep(0); setActiveAnalysis(null); setSelectedImage(null); }} className="bg-gradient-to-r from-[#635BFF] to-[#635BFF] text-[#FFFFFF] px-6 py-4 rounded-full shadow-[0_8px_30px_rgba(99,102,241,0.4)] font-bold flex items-center gap-2 active:scale-95 transition-all">
          <Plus size={20} strokeWidth={3}/> Log Meal
        </button>
        <button onClick={() => setIsAIChatOpen(true)} className="bg-[#FFFFFF] text-[#635BFF] w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#EBE8E0] font-bold flex items-center justify-center active:scale-95 transition-all">
          <Bot size={22} />
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 pt-8 pb-2">
          <div>
            <h1 className="text-2xl font-black text-[#3D3B38] tracking-tight">diet<span className="text-[#635BFF]">Buddy</span></h1>
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#E67F63]/10 text-[#E67F63] font-black text-[10px] uppercase tracking-widest">
              <Flame size={12} /> {activeStreak} Day Streak
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefreshClick} className="w-10 h-10 bg-[#FFFFFF] rounded-xl border border-[#EBE8E0] shadow-sm flex items-center justify-center text-[#8D8B86] hover:text-[#3D3B38] active:scale-95 transition-all">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-[#FFFFFF] rounded-xl border border-[#EBE8E0] shadow-sm flex items-center justify-center text-[#8D8B86] hover:text-[#3D3B38] active:scale-95 transition-all">
              <Settings size={16} />
            </button>
            <button onClick={() => signOut({ callbackUrl: `${window.location.origin}/auth/login` })} className="w-10 h-10 bg-[#FFFFFF] rounded-xl border border-[#EBE8E0] shadow-sm flex items-center justify-center text-red-400 hover:text-red-500 active:scale-95 transition-all">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* EXTRA TOOLS */}
        <div className="px-6 flex gap-3 overflow-x-auto hide-scrollbar">
          <button onClick={() => setIsFridgeRaiderOpen(true)} className="shrink-0 px-4 py-2 bg-[#FFFFFF] border border-[#EBE8E0] rounded-xl text-xs font-bold text-[#3D3B38] shadow-sm flex items-center gap-2 active:scale-95">
            <Utensils size={14} className="text-[#635BFF]"/> AI Fridge Raider
          </button>
          <button onClick={() => setIsGroceryListOpen(true)} className="shrink-0 px-4 py-2 bg-[#FFFFFF] border border-[#EBE8E0] rounded-xl text-xs font-bold text-[#3D3B38] shadow-sm flex items-center gap-2 active:scale-95">
            <ShoppingCart size={14} className="text-[#83B593]"/> Grocery List
          </button>
        </div>

        {/* SCORE HANDLER */}
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="px-6 mt-4">
          <div className="bg-[#FFFFFF] border border-[#EBE8E0] shadow-sm rounded-3xl p-6">
            <div className="flex items-center justify-between mb-8">
               <span className="text-[10px] font-black text-[#8D8B86] tracking-widest uppercase">Daily Targets</span>
               {isOverCal ? <span className="text-[9px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Over Target</span> : <span className="text-[9px] text-[#83B593] font-bold bg-[#83B593]/10 px-2 py-0.5 rounded-full border border-[#83B593]/20">On Track</span>}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
               {/* Minimal Single Ring for Calories */}
               <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                     <circle cx="72" cy="72" r="62" stroke="#F7F5F0" strokeWidth="12" fill="none" />
                     <motion.circle 
                        cx="72" cy="72" r="62" stroke={isOverCal ? "#ef4444" : "#635BFF"} strokeWidth="12" fill="none" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 62}
                        initial={{ strokeDashoffset: 2 * Math.PI * 62 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 62 * (1 - calPercent / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                     />
                  </svg>
                  <div className="absolute text-center flex flex-col items-center">
                    <span className="text-3xl font-black text-[#3D3B38] leading-none">{todayTotals.calories}</span>
                    <span className="text-[10px] text-[#8D8B86] font-bold mt-1">/ {dailyGoals.calories} kcal</span>
                  </div>
               </div>
               
               {/* Linear Sub-bars for Macros */}
               <div className="flex-1 w-full space-y-5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5 font-bold"><span className="text-[#8D8B86]">Protein</span><span className="text-[#83B593]">{todayTotals.protein}g / {dailyGoals.protein}g</span></div>
                    <div className="h-2 w-full bg-[#F7F5F0] rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width: `${protPercent}%`}} transition={{duration:1}} className="h-full bg-[#83B593] rounded-full"/>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5 font-bold"><span className="text-[#8D8B86]">Fats</span><span className="text-[#E67F63]">{todayTotals.fat}g / {dailyGoals.fat}g</span></div>
                    <div className="h-2 w-full bg-[#F7F5F0] rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width: `${fatPercent}%`}} transition={{duration:1, delay:0.1}} className="h-full bg-[#E67F63] rounded-full"/>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5 font-bold"><span className="text-[#8D8B86]">Fiber</span><span className="text-[#5C99D6]">{todayTotals.fiber}g / {dailyGoals.fiber}g</span></div>
                    <div className="h-2 w-full bg-[#F7F5F0] rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width: `${fibPercent}%`}} transition={{duration:1, delay:0.2}} className="h-full bg-[#5C99D6] rounded-full"/>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>

        {/* TODAY'S MEALS */}
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="px-6">
          <div className="flex justify-between items-center mb-4 px-1">
             <h3 className="text-[13px] font-black text-[#3D3B38] tracking-tight">Today's Meals</h3>
             <span className="text-[10px] font-bold text-[#8D8B86]">{todayMeals.length} logged</span>
          </div>

          {todayMeals.length === 0 ? (
             <div className="bg-[#FFFFFF] border border-[#EBE8E0] border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                <Activity className="w-8 h-8 text-[#EBE8E0] mb-3" />
                <p className="text-sm font-bold text-[#3D3B38]">No meals logged</p>
                <p className="text-xs text-[#8D8B86] mt-1 max-w-[200px]">Use the Log Meal button below to snap your first plate.</p>
             </div>
          ) : (
             <div className="space-y-3">
               {todayMeals.map(meal => (
                 <div key={meal.id} onClick={() => setSelectedMeal(selectedMeal === meal.id ? null : meal.id)} className="bg-[#FFFFFF] border border-[#EBE8E0] rounded-2xl p-4 shadow-sm cursor-pointer hover:border-[#635BFF] transition-all">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-sm font-bold text-[#3D3B38]">{meal.summary}</p>
                       <p className="text-[10px] font-semibold text-[#8D8B86] mt-0.5">{new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                     <div className="text-right">
                       <span className="text-sm font-black text-[#635BFF]">{meal.totalCalories} kcal</span>
                       <p className="text-[9px] font-bold text-[#83B593] mt-0.5">{meal.totalProtein}g protein</p>
                     </div>
                   </div>
                   {selectedMeal === meal.id && (
                     <div className="mt-4 pt-4 border-t border-[#EBE8E0] space-y-2">
                       {meal.items.map(item => (
                         <div key={item.id} className="flex justify-between items-center text-[11px]">
                           <span className="font-bold text-[#3D3B38]">{item.name}</span>
                           <span className="font-semibold text-[#8D8B86]">{item.calories} kcal</span>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               ))}
             </div>
          )}
        </motion.div>

        {/* WEEKLY CHART */}
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="px-6 mb-8">
          <div className="bg-[#FFFFFF] border border-[#EBE8E0] shadow-sm rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px] font-black text-[#3D3B38]">Weekly Trends</h3>
              <div className="flex bg-[#F7F5F0] rounded-lg p-1 border border-[#EBE8E0]">
                {(['Calories', 'Protein', 'Fats'] as const).map((m) => (
                  <button key={m} onClick={() => setActiveMetric(m)} className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${activeMetric === m ? 'bg-[#FFFFFF] text-[#3D3B38] shadow-sm' : 'text-[#8D8B86]'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E0" vertical={false} />
                  <XAxis dataKey="name" stroke="#8D8B86" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8D8B86" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#3D3B38', border: 'none', borderRadius: '12px', color: '#FFFFFF', fontSize: '11px', fontWeight: 'bold' }} itemStyle={{ color: '#FFFFFF' }} cursor={{fill: '#F7F5F0'}} />
                  <Bar dataKey={activeMetric} fill={activeMetric === 'Calories' ? '#635BFF' : activeMetric === 'Protein' ? '#83B593' : '#E67F63'} radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- MODALS --- */}

      {/* Upload/Log Meal Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#3D3B38]/60 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-lg bg-[#FFFFFF] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
              
              <div className="flex items-center justify-between p-5 border-b border-[#EBE8E0]">
                <h3 className="text-[15px] font-black text-[#3D3B38]">Log Meal</h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F7F5F0] text-[#3D3B38]"><X size={16}/></button>
              </div>

              <div className="p-6 overflow-y-auto">
                {uploadStep === 0 && (
                  <div className="space-y-6">
                    {/* Camera / Voice / Gallery actions */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="relative bg-[#F7F5F0] border border-[#EBE8E0] rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="w-10 h-10 rounded-full bg-[#FFFFFF] shadow-sm flex items-center justify-center text-[#635BFF]"><Upload size={18} /></div>
                        <span className="text-[10px] font-bold text-[#3D3B38]">Upload</span>
                      </div>
                      <div className="relative bg-[#F7F5F0] border border-[#EBE8E0] rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="w-10 h-10 rounded-full bg-[#FFFFFF] shadow-sm flex items-center justify-center text-[#83B593]"><Camera size={18} /></div>
                        <span className="text-[10px] font-bold text-[#3D3B38]">Camera</span>
                      </div>
                      <div className="relative bg-[#F7F5F0] border border-[#EBE8E0] rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                        <button onPointerDown={startListening} onPointerUp={stopListening} onPointerLeave={stopListening} className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center z-10 relative ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#FFFFFF] text-[#E67F63]'}`}>
                          {isListening ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>
                        <span className="text-[10px] font-bold text-[#3D3B38]">{isListening ? "Listening" : "Hold to Talk"}</span>
                      </div>
                    </div>

                    {transcript && <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-xs font-semibold text-red-500 italic">"{transcript}"</div>}
                    
                    {selectedImage && (
                      <div className="p-4 bg-[#635BFF]/5 rounded-2xl border border-[#635BFF]/20 text-center">
                        <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden mb-3 border border-[#EBE8E0]"><img src={selectedImage} className="w-full h-full object-cover"/></div>
                        <button onClick={handleStartAnalysis} className="w-full py-3 bg-[#635BFF] text-white rounded-xl font-bold text-sm shadow-md">Run AI Scan ✨</button>
                      </div>
                    )}

                    {!selectedImage && (
                      <>
                        <div className="text-center">
                          <span className="text-[9px] font-black tracking-widest uppercase text-[#8D8B86]">Or use a preset</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {FOOD_PRESETS.map((preset) => (
                            <div key={preset.id} onClick={() => { setActiveAnalysis(preset); setCustomMealName(preset.name); setUploadStep(1); }} className="bg-[#FFFFFF] border border-[#EBE8E0] p-4 rounded-2xl flex flex-col items-center text-center cursor-pointer active:scale-95 transition-transform shadow-sm">
                              <span className="text-3xl mb-2">{preset.icon}</span>
                              <span className="text-[10px] font-bold text-[#3D3B38] leading-tight mb-1">{preset.name}</span>
                              <span className="text-[9px] font-bold text-[#635BFF]">{preset.totalCalories} kcal</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Loading / Analyzing */}
                {uploadStep === 1 && (
                  <div className="py-12 text-center space-y-6">
                    <div className="relative w-32 h-32 mx-auto rounded-3xl bg-[#F7F5F0] overflow-hidden flex items-center justify-center border border-[#EBE8E0]">
                      {selectedImage ? <img src={selectedImage} className="w-full h-full object-cover opacity-60"/> : <span className="text-4xl">🤖</span>}
                      <motion.div className="absolute inset-x-0 h-1 bg-[#635BFF] shadow-[0_0_15px_#635BFF]" animate={{y:[0, 128, 0]}} transition={{duration:2, repeat:Infinity}} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#3D3B38]">GPT-4o Vision Active</h4>
                      <p className="text-xs font-bold text-[#635BFF] mt-1">{SCAN_MESSAGES[scanningMsgIdx]}</p>
                    </div>
                    {analysisError && (
                      <div className="mt-4 mx-4 p-3 bg-red-50 text-red-500 rounded-xl border border-red-100 text-xs font-bold">
                        Error: {analysisError}
                        <button onClick={() => { setUploadStep(0); setAnalysisError(null); }} className="block w-full py-2 bg-red-500 text-white rounded-lg mt-3 uppercase tracking-widest text-[10px]">Try Again</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Review */}
                {uploadStep === 2 && activeAnalysis && (
                  <div className="space-y-6">
                    <div className="p-4 bg-[#F7F5F0] rounded-2xl border border-[#EBE8E0]">
                      <div className="flex justify-between items-baseline mb-3">
                        <span className="text-[11px] font-black text-[#8D8B86] uppercase tracking-widest">Total Macros</span>
                        <span className="text-2xl font-black text-[#3D3B38]">{activeAnalysis.totalCalories} <span className="text-sm">kcal</span></span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#83B593]">{activeAnalysis.totalProtein}g Protein</span>
                        <span className="text-[#E67F63]">{activeAnalysis.totalFat}g Fat</span>
                        <span className="text-[#5C99D6]">{activeAnalysis.totalFiber}g Fiber</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-[#8D8B86] uppercase tracking-widest block mb-2">Meal Title</label>
                      <input type="text" value={customMealName} onChange={(e)=>setCustomMealName(e.target.value)} className="w-full px-4 py-3 bg-[#FFFFFF] border border-[#EBE8E0] rounded-xl text-sm font-bold text-[#3D3B38] focus:outline-none focus:border-[#635BFF]" />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-[#8D8B86] uppercase tracking-widest">Identified Items</label>
                        <button onClick={handleAddItem} className="text-[#635BFF] flex items-center gap-1 text-[10px] font-bold"><Plus size={12}/> Add Missing</button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {activeAnalysis.items?.map((item: any, index: number) => (
                          <div key={index} className="bg-[#FFFFFF] border border-[#EBE8E0] rounded-xl p-3 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <input type="text" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} className="text-sm font-bold text-[#3D3B38] focus:outline-none bg-transparent w-full" placeholder="Food name"/>
                              <button onClick={() => handleItemDelete(index)} className="text-red-400 hover:bg-red-50 rounded-md p-1 transition-colors"><Trash2 size={14}/></button>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-[#3D3B38]">
                              <div className="flex flex-col"><span className="text-[#8D8B86] uppercase tracking-wider text-[8px] mb-1">Cals</span><input type="number" value={item.calories} onChange={(e) => handleItemChange(index, 'calories', parseInt(e.target.value)||0)} className="bg-[#F7F5F0] rounded px-2 py-1.5 focus:outline-none border border-transparent focus:border-[#635BFF]/30"/></div>
                              <div className="flex flex-col"><span className="text-[#8D8B86] uppercase tracking-wider text-[8px] mb-1">Pro (g)</span><input type="number" value={item.protein} onChange={(e) => handleItemChange(index, 'protein', parseInt(e.target.value)||0)} className="bg-[#F7F5F0] rounded px-2 py-1.5 focus:outline-none border border-transparent focus:border-[#83B593]/30"/></div>
                              <div className="flex flex-col"><span className="text-[#8D8B86] uppercase tracking-wider text-[8px] mb-1">Fat (g)</span><input type="number" value={item.fat} onChange={(e) => handleItemChange(index, 'fat', parseInt(e.target.value)||0)} className="bg-[#F7F5F0] rounded px-2 py-1.5 focus:outline-none border border-transparent focus:border-[#E67F63]/30"/></div>
                              <div className="flex flex-col"><span className="text-[#8D8B86] uppercase tracking-wider text-[8px] mb-1">Fib (g)</span><input type="number" value={item.fiber} onChange={(e) => handleItemChange(index, 'fiber', parseInt(e.target.value)||0)} className="bg-[#F7F5F0] rounded px-2 py-1.5 focus:outline-none border border-transparent focus:border-[#5C99D6]/30"/></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button disabled={isSavingMeal} onClick={handleSaveMeal} className="w-full py-4 bg-[#635BFF] text-white rounded-xl font-bold text-sm shadow-[0_4px_14px_rgba(99,102,241,0.4)] disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95 transition-all mt-4">
                      {isSavingMeal ? <RefreshCw className="animate-spin" size={16}/> : <Check size={16}/>} Save to Log
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goals Setting Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D3B38]/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm bg-[#FFFFFF] rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-[#EBE8E0] flex justify-between items-center">
                <h3 className="text-sm font-black text-[#3D3B38]">Daily Targets</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[#8D8B86]"><X size={18}/></button>
              </div>
              <form onSubmit={handleSaveGoals} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#8D8B86] uppercase block mb-1">Calories</label>
                    <input type="number" value={targetCals} onChange={(e)=>setTargetCals(e.target.value)} className="w-full bg-[#F7F5F0] border border-[#EBE8E0] px-3 py-2 rounded-xl text-sm font-bold text-[#3D3B38]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#8D8B86] uppercase block mb-1">Protein (g)</label>
                    <input type="number" value={targetProtein} onChange={(e)=>setTargetProtein(e.target.value)} className="w-full bg-[#F7F5F0] border border-[#EBE8E0] px-3 py-2 rounded-xl text-sm font-bold text-[#3D3B38]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#8D8B86] uppercase block mb-1">Fats (g)</label>
                    <input type="number" value={targetFat} onChange={(e)=>setTargetFat(e.target.value)} className="w-full bg-[#F7F5F0] border border-[#EBE8E0] px-3 py-2 rounded-xl text-sm font-bold text-[#3D3B38]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#8D8B86] uppercase block mb-1">Fiber (g)</label>
                    <input type="number" value={targetFiber} onChange={(e)=>setTargetFiber(e.target.value)} className="w-full bg-[#F7F5F0] border border-[#EBE8E0] px-3 py-2 rounded-xl text-sm font-bold text-[#3D3B38]" />
                  </div>
                </div>
                <button type="submit" disabled={isSaving} className="w-full mt-4 py-3 bg-[#3D3B38] text-white rounded-xl font-bold text-xs">Save Goals</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auxiliary Modals */}
      {isFridgeRaiderOpen && <FridgeRaider onClose={() => setIsFridgeRaiderOpen(false)} />}
      {isGroceryListOpen && <GroceryListModal onClose={() => setIsGroceryListOpen(false)} />}
      {isAIChatOpen && <AIChatModal onClose={() => setIsAIChatOpen(false)} />}
      {isPaywallOpen && <Paywall onClose={() => setIsPaywallOpen(false)} onSuccess={() => { setIsPaywallOpen(false); setIsPremium(true); window.location.reload(); }} />}
      
    </div>
  );
}
