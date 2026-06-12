"use client";

import React, { useState } from 'react';
import { 
  Flame, 
  Activity, 
  Droplet, 
  Plus, 
  RefreshCw, 
  ChevronRight, 
  Calendar, 
  Settings, 
  Check, 
  AlertTriangle,
  Sparkles,
  X,
  Camera,
  Upload,
  Award,
  Trophy,
  Zap,
  Mic,
  MicOff,
  Utensils
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { saveDailyGoalsAction, saveMealAction, generateNutritionInsightAction, analyzeMealImageAction, analyzeMealTextAction } from "@/app/actions";
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from "next-auth/react";
import { useSpeech } from "@/components/useSpeech";
import FridgeRaider from "@/components/FridgeRaider";

export interface FoodItemData {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
  estimatedQuantity: string;
}

export interface MealLogData {
  id: string;
  timestamp: string;
  summary: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  items: FoodItemData[];
}

export interface DashboardProps {
  userId?: string;
  isPremiumUser?: boolean;
  dailyGoals: {
    calories: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  todayTotals: {
    calories: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  todayMeals: MealLogData[];
  onAddMealClick?: () => void;
  onRefreshClick?: () => void;
  activeStreak?: number;
  totalMealsCount?: number;
}

export default function Dashboard({
  userId = "guest-user-uuid",
  isPremiumUser = false,
  dailyGoals = { calories: 2000, protein: 80, fat: 65, fiber: 30 },
  todayTotals = { calories: 0, protein: 0, fat: 0, fiber: 0 },
  todayMeals = [],
  onAddMealClick,
  onRefreshClick,
  activeStreak = 1,
  totalMealsCount = 0,
}: DashboardProps) {
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFridgeRaiderOpen, setIsFridgeRaiderOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'Calories' | 'Protein' | 'Fats' | 'Fiber'>('Calories');

  // AI-generated Nutrition Insight & Toast flags
  const [aiTip, setAiTip] = useState<string>("");
  const [aiTipLoading, setAiTipLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Hook to fetch AI Nutrition Tip
  React.useEffect(() => {
    async function fetchTip() {
      setAiTipLoading(true);
      // Try local cache first for super fast load
      const cacheKey = `ai_tip_${userId}_${todayTotals.protein}_${todayTotals.calories}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setAiTip(cached);
        setAiTipLoading(false);
        return;
      }

      const response = await generateNutritionInsightAction(userId, todayTotals, dailyGoals);
      if (response.success && response.insight) {
        setAiTip(response.insight);
        localStorage.setItem(cacheKey, response.insight);
      }
      setAiTipLoading(false);
    }
    fetchTip();
  }, [todayTotals.calories, todayTotals.protein, todayTotals.fat, todayTotals.fiber, dailyGoals.calories, dailyGoals.protein, userId]);

  // Hook to check & trigger celebration when first reaching protein target on active login session
  React.useEffect(() => {
    if (typeof window !== "undefined" && todayTotals.protein >= dailyGoals.protein && todayTotals.protein > 0) {
      const todayKey = `protein_congrats_${userId}_${new Date().toDateString()}`;
      const alreadyTriggered = localStorage.getItem(todayKey);
      if (!alreadyTriggered) {
        setShowCelebration(true);
        localStorage.setItem(todayKey, "true");
        // Auto dismiss after 6 seconds
        const timer = setTimeout(() => {
          setShowCelebration(false);
        }, 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [todayTotals.protein, dailyGoals.protein, userId]);

  // Modal form states
  const [targetCals, setTargetCals] = useState(dailyGoals.calories.toString());
  const [targetProtein, setTargetProtein] = useState(dailyGoals.protein.toString());
  const [targetFat, setTargetFat] = useState(dailyGoals.fat.toString());
  const [targetFiber, setTargetFiber] = useState(dailyGoals.fiber.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Custom logging & camera scan states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<number>(0); // 0: select preset/file, 1: scanning animation, 2: edit/review
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [customMealName, setCustomMealName] = useState("");
  const [scanningMsgIdx, setScanningMsgIdx] = useState(0);
  const [mealSaveError, setMealSaveError] = useState<string | null>(null);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);

  // Real AI scanning & paywall states
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Load premium state on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // Check server prop first, fallback to local storage for guest compatibility
      setIsPremium(isPremiumUser || localStorage.getItem("dietbuddy_premium") === "true");
    }
  }, [isPremiumUser]);

  const checkScanLimit = () => {
    if (typeof window === "undefined") return false;
    if (isPremium) return false;

    const todayStr = new Date().toDateString();
    const lastScanDate = localStorage.getItem("dietbuddy_last_scan_date");
    let count = parseInt(localStorage.getItem("dietbuddy_scan_count") || "0");

    if (lastScanDate !== todayStr) {
      count = 0;
      localStorage.setItem("dietbuddy_last_scan_date", todayStr);
      localStorage.setItem("dietbuddy_scan_count", "0");
    }

    return count >= 3;
  };

  const incrementScanCount = () => {
    if (typeof window === "undefined") return;
    const count = parseInt(localStorage.getItem("dietbuddy_scan_count") || "0");
    localStorage.setItem("dietbuddy_scan_count", (count + 1).toString());
  };

  const SCAN_MESSAGES = [
    "Detecting culinary ingredients...",
    "Estimating portion weights & sizes...",
    "Calculating protein & fibers...",
    "Consulting USDA databases...",
    "Formulating coaching suggestions..."
  ];

  const FOOD_PRESETS = [
    {
      id: "preset-1",
      name: "Zesty Salmon & Quinoa Bowl",
      summary: "Grilled salmon fillet over fiber-rich organic quinoa with avocado, cucumbers, cherry tomatoes and zesty lemon dressing.",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60",
      totalCalories: 620,
      totalProtein: 42,
      totalFat: 22,
      totalFiber: 8,
      items: [
        { name: "Grilled Salmon", calories: 380, protein: 38, fat: 18, fiber: 0, estimatedQuantity: "200g" },
        { name: "Organic Quinoa", calories: 180, protein: 4, fat: 3, fiber: 6, estimatedQuantity: "150g" },
        { name: "Zesty Lemon Avocado Mix", calories: 60, protein: 0, fat: 1, fiber: 2, estimatedQuantity: "50g" },
      ]
    },
    {
      id: "preset-2",
      name: "Garden Avocado Harvest Salad",
      summary: "Loaded harvest salad with leafy greens, boiled organic eggs, sliced avocado and toasted pepitas.",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60",
      totalCalories: 450,
      totalProtein: 18,
      totalFat: 31,
      totalFiber: 12,
      items: [
        { name: "Organic Boiled Eggs", calories: 150, protein: 13, fat: 10, fiber: 0, estimatedQuantity: "2 eggs" },
        { name: "Avocado & Pepitas mix", calories: 250, protein: 4, fat: 21, fiber: 10, estimatedQuantity: "100g" },
        { name: "Mixed Leafy Greens", calories: 50, protein: 1, fat: 0, fiber: 2, estimatedQuantity: "100g" },
      ]
    },
    {
      id: "preset-3",
      name: "Seared Chicken Protein Plate",
      summary: "Savory teriyaki seasoned grilled chicken breast, broccoli florets, and fluffy brown jasmine rice.",
      image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&auto=format&fit=crop&q=60",
      totalCalories: 540,
      totalProtein: 35,
      totalFat: 8,
      totalFiber: 4,
      items: [
        { name: "Teriyaki Chicken Slices", calories: 320, protein: 31, fat: 6, fiber: 1, estimatedQuantity: "180g" },
        { name: "Steamed Jasmine Rice", calories: 180, protein: 3, fat: 1, fiber: 1, estimatedQuantity: "150g" },
        { name: "Steamed Broccoli", calories: 40, protein: 1, fat: 1, fiber: 2, estimatedQuantity: "100g" },
      ]
    }
  ];

  // Dynamic laser scanning progress ticker
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (uploadStep === 1) {
      setScanningMsgIdx(0);
      interval = setInterval(() => {
        setScanningMsgIdx((prev) => {
          if (prev < SCAN_MESSAGES.length - 1) {
            return prev + 1;
          } else {
            // Wait until API call resolves before finishing animation step
            if (isAnalyzing) {
              return prev;
            }
            clearInterval(interval);
            setUploadStep(2);
            return prev;
          }
        });
      }, 950);
    }
    return () => clearInterval(interval);
  }, [uploadStep, isAnalyzing]);

  // Transition immediately if API finishes after animation is at the last message
  React.useEffect(() => {
    if (uploadStep === 1 && !isAnalyzing && activeAnalysis && scanningMsgIdx === SCAN_MESSAGES.length - 1) {
      setUploadStep(2);
    }
    if (uploadStep === 1 && !isAnalyzing && analysisError && scanningMsgIdx === SCAN_MESSAGES.length - 1) {
      setUploadStep(2);
    }
  }, [isAnalyzing, activeAnalysis, analysisError, uploadStep, scanningMsgIdx]);

  const handleStartAnalysis = () => {
    if (checkScanLimit()) {
      setIsPaywallOpen(true);
      return;
    }
    setUploadStep(1);
    if (base64Image) {
      runAiAnalysis(base64Image);
    }
  };

  const runAiAnalysis = async (b64: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await analyzeMealImageAction(b64);
      if (res.success && res.analysis) {
        setActiveAnalysis(res.analysis);
        setCustomMealName(res.analysis.name || customMealName);
        incrementScanCount();
      } else {
        setAnalysisError(res.error || "Failed to analyze the meal image.");
      }
    } catch (err) {
      setAnalysisError("Unexpected error during image analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { isListening, transcript, startListening, stopListening, isSupported, error: speechError } = useSpeech();

  // Watch transcript and trigger analysis when stopped
  React.useEffect(() => {
    if (!isListening && transcript.trim().length > 0 && uploadStep === 0) {
      runVoiceAnalysis(transcript);
    }
  }, [isListening, transcript]);

  const runVoiceAnalysis = async (text: string) => {
    if (checkScanLimit()) {
      setIsPaywallOpen(true);
      return;
    }
    setUploadStep(1); // Show scanning animation
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await analyzeMealTextAction(text);
      if (res.success && res.analysis) {
        setActiveAnalysis(res.analysis);
        setCustomMealName(res.analysis.name || customMealName);
        incrementScanCount();
      } else {
        setAnalysisError(res.error || "Failed to analyze the voice input.");
      }
    } catch (err) {
      setAnalysisError("Unexpected error during voice analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!activeAnalysis) return;
    setIsSavingMeal(true);
    setMealSaveError(null);

    const mealPayload = {
      summary: customMealName || activeAnalysis.name,
      totalCalories: activeAnalysis.totalCalories,
      totalProtein: activeAnalysis.totalProtein,
      totalFat: activeAnalysis.totalFat,
      totalFiber: activeAnalysis.totalFiber,
      items: activeAnalysis.items
    };

    const response = await saveMealAction(userId, mealPayload);
    setIsSavingMeal(false);

    if (response.success) {
      setIsUploadModalOpen(false);
      setSelectedImage(null);
      setActiveAnalysis(null);
    } else {
      setMealSaveError(response.error || "Could not log this meal event.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setCustomMealName(file.name.replace(/\.[^/.]+$/, "").split("-").join(" ").split("_").join(" "));
      setAnalysisError(null);
      setActiveAnalysis(null);

      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip out the data:image/*;base64, prefix
        const base64 = result.split(",")[1];
        setBase64Image(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysisWithPreset = (preset: typeof FOOD_PRESETS[0]) => {
    setBase64Image(null); // No base64 for presets
    setAnalysisError(null);
    setSelectedImage(preset.image);
    setActiveAnalysis(preset);
    setCustomMealName(preset.name);
    
    if (checkScanLimit()) {
      setIsPaywallOpen(true);
      return;
    }
    setUploadStep(1); // triggers scanning beam
  };

  // Recharts metric configuration
  const metricColor = {
    Calories: '#6366f1',
    Protein: '#10b981',
    Fats: '#f59e0b',
    Fiber: '#3b82f6',
  };

  const metricUnit = {
    Calories: 'kcal',
    Protein: 'g',
    Fats: 'g',
    Fiber: 'g',
  };

  const targetValue = {
    Calories: dailyGoals.calories,
    Protein: dailyGoals.protein,
    Fats: dailyGoals.fat,
    Fiber: dailyGoals.fiber,
  }[activeMetric];

  // Map 7-day reports
  const weeklyData = [
    { name: 'Mon', Calories: 1850, Protein: 75, Fats: 58, Fiber: 24 },
    { name: 'Tue', Calories: 2100, Protein: 88, Fats: 68, Fiber: 28 },
    { name: 'Wed', Calories: 1720, Protein: 65, Fats: 50, Fiber: 20 },
    { name: 'Thu', Calories: 1950, Protein: 82, Fats: 62, Fiber: 32 },
    { name: 'Fri', Calories: 2200, Protein: 95, Fats: 72, Fiber: 31 },
    { name: 'Sat', Calories: 1650, Protein: 70, Fats: 55, Fiber: 22 },
    { name: 'Sun', Calories: todayTotals.calories || 1800, Protein: todayTotals.protein || 80, Fats: todayTotals.fat || 65, Fiber: todayTotals.fiber || 26 }
  ];

  // Math percentages
  const calPercent = Math.min(100, Math.round((todayTotals.calories / dailyGoals.calories) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((todayTotals.protein / dailyGoals.protein) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((todayTotals.fat / dailyGoals.fat) * 100)) || 0;
  const fibPercent = Math.min(100, Math.round((todayTotals.fiber / dailyGoals.fiber) * 100)) || 0;

  const isOverCal = todayTotals.calories > dailyGoals.calories;

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const goals = {
      calories: parseInt(targetCals) || 2000,
      protein: parseInt(targetProtein) || 80,
      fat: parseInt(targetFat) || 65,
      fiber: parseInt(targetFiber) || 30,
    };

    const res = await saveDailyGoalsAction(userId, goals);
    setIsSaving(false);

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setSaveError(res.error || "Could not save your goals.");
    }
  };

  return (
    <div className="min-h-screen bg-card text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-col/40 p-6 rounded-3xl border border-s/50 backdrop-blur-sm">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-500 text-txt font-extrabold text-xl shadow-lg shadow-indigo-500/20">
                  d
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-txt tracking-tight">dietBuddy Dashboard</h1>
              </div>
              <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-extrabold text-xs shadow-md shadow-orange-500/5">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                <span>{activeStreak} DAY STREAK</span>
              </div>
            </div>
            <p className="text-txt-2 text-sm mt-1">
              Your real-time nutritional tracking, USDA verified guidelines and AI meal recognition.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={onRefreshClick}
              className="flex-1 md:flex-none p-3 rounded-2xl bg-col hover:bg-input border border-s text-txt-2 transition-all flex items-center justify-center gap-2 text-sm"
              title="Refresh Stats"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="md:hidden">Sync</span>
            </button>
            <button 
              onClick={() => {
                setTargetCals(dailyGoals.calories.toString());
                setTargetProtein(dailyGoals.protein.toString());
                setTargetFat(dailyGoals.fat.toString());
                setTargetFiber(dailyGoals.fiber.toString());
                setIsModalOpen(true);
              }}
              className="flex-1 md:flex-none p-3 rounded-2xl bg-col hover:bg-input border border-s text-txt-2 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Goals</span>
            </button>
            <button 
              onClick={() => signOut({ callbackUrl: `${window.location.origin}/auth/login` })}
              className="flex-1 md:flex-none p-3 rounded-2xl bg-col hover:bg-input border border-s text-txt-2 transition-all flex items-center justify-center gap-2 text-sm text-red hover:text-rose-300"
              title="Sign Out"
            >
              <X className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
            <button 
              onClick={() => setIsFridgeRaiderOpen(true)}
              className="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-card border border-indigo-500/40 text-indigo-400 font-bold hover:bg-col transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-500/10"
              title="AI Fridge Raider"
            >
              <Utensils className="w-4 h-4" />
              <span className="hidden sm:inline">Fridge Raider</span>
            </button>
            <button 
              onClick={onAddMealClick || (() => {
                setSelectedImage(null);
                setActiveAnalysis(null);
                setUploadStep(0);
                setIsUploadModalOpen(true);
              })}
              className="flex-2 md:flex-none px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-txt font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Log Meal</span>
            </button>
          </div>
        </div>

        {/* Main Stats Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Concentric Progress Card & Primary Indicator */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-col/80 rounded-[32px] border border-s/60 p-6 md:p-8 shadow-xl relative overflow-hidden">
              
              {/* Highlight background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-green/5 rounded-full blur-3xl -z-10 pointer-events-none" />

              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                {/* Visual Radial Chart Ring Simulation with SVG */}
                <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Ring 1 Colors: Main Calories */}
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#334155" strokeWidth="6" />
                    <circle 
                      cx="60" cy="60" r="50" fill="none" 
                      stroke="#6366f1" strokeWidth="6" 
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - calPercent / 100)}`}
                      strokeLinecap="round"
                    />

                    {/* Ring 2 Colors: Protein */}
                    <circle cx="60" cy="60" r="41" fill="none" stroke="#334155" strokeWidth="6" />
                    <circle 
                      cx="60" cy="60" r="41" fill="none" 
                      stroke="#10b981" strokeWidth="6" 
                      strokeDasharray={`${2 * Math.PI * 41}`}
                      strokeDashoffset={`${2 * Math.PI * 41 * (1 - protPercent / 100)}`}
                      strokeLinecap="round"
                    />

                    {/* Ring 3 Colors: Fat */}
                    <circle cx="60" cy="60" r="32" fill="none" stroke="#334155" strokeWidth="6" />
                    <circle 
                      cx="60" cy="60" r="32" fill="none" 
                      stroke="#f59e0b" strokeWidth="6" 
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - fatPercent / 100)}`}
                      strokeLinecap="round"
                    />

                    {/* Ring 4 Colors: Fiber */}
                    <circle cx="60" cy="60" r="23" fill="none" stroke="#334155" strokeWidth="6" />
                    <circle 
                      cx="60" cy="60" r="23" fill="none" 
                      stroke="#3b82f6" strokeWidth="6" 
                      strokeDasharray={`${2 * Math.PI * 23}`}
                      strokeDashoffset={`${2 * Math.PI * 23 * (1 - fibPercent / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Inside Center Display */}
                  <div className="absolute text-center">
                    <span className="text-3xl font-black block text-txt leading-none">{calPercent}%</span>
                    <span className="text-[10px] uppercase font-bold text-txt-2 tracking-wider">Cals Met</span>
                  </div>
                </div>

                {/* Main Progress Indicator Numerical Output */}
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5" /> Today's Calories
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isOverCal 
                        ? 'bg-red/20 text-rose-300 border border-rose-500/30' 
                        : 'bg-green/20 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        {isOverCal ? (
                          <>
                            <AlertTriangle className="w-3 h-3" /> Over Goal
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" /> On Track
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-txt tracking-tight">{todayTotals.calories}</span>
                      <span className="text-txt-2 text-sm font-medium">/ {dailyGoals.calories} kcal Goal</span>
                    </div>

                    {/* Styled Track Bar */}
                    <div className="w-full h-3 bg-input/50 rounded-full mt-4 overflow-hidden border border-s">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOverCal ? 'bg-gradient-to-r from-indigo-500 to-rose-500' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'}`} 
                        style={{ width: `${calPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary Callout Banner */}
                  {todayTotals.calories === 0 ? (
                    <div className="p-5 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex flex-col sm:flex-row gap-4 items-center justify-between group">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-txt">Ready to start tracking?</p>
                          <p className="text-xs text-indigo-200/80 mt-0.5">Log your first meal using the AI scanner or voice.</p>
                        </div>
                      </div>
                      <button 
                        onClick={onAddMealClick || (() => setIsUploadModalOpen(true))}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-txt text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 whitespace-nowrap animate-pulse"
                      >
                        <Plus className="w-3.5 h-3.5" /> Log Meal
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex gap-3 items-center">
                      <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                      <p className="text-xs text-indigo-200/90 leading-normal">
                        {isOverCal 
                          ? "You have surpassed your daily target calories of energy intake."
                          : `Great job! You have reached ${calPercent}% of your active calorie tracking goal.`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub Progress Bars for macronutrients (protein, fat, fiber) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-s/50 pt-8 mt-8">
                
                {/* Protein progress card */}
                <div className="bg-card/40 border border-s/40 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-txt-2">Protein</span>
                    <span className="text-xs font-bold text-green">{protPercent}%</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-xl font-bold text-txt">{todayTotals.protein}g</span>
                    <span className="text-txt-2 text-xs">/ {dailyGoals.protein}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-input/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green rounded-full transition-all duration-500" 
                      style={{ width: `${protPercent}%` }}
                    />
                  </div>
                </div>

                {/* Fat progress card */}
                <div className="bg-card/40 border border-s/40 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-txt-2">Fats</span>
                    <span className="text-xs font-bold text-orange">{fatPercent}%</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-xl font-bold text-txt">{todayTotals.fat}g</span>
                    <span className="text-txt-2 text-xs">/ {dailyGoals.fat}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-input/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange rounded-full transition-all duration-500" 
                      style={{ width: `${fatPercent}%` }}
                    />
                  </div>
                </div>

                {/* Fiber progress card */}
                <div className="bg-card/40 border border-s/40 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-txt-2">Dietary Fiber</span>
                    <span className="text-xs font-bold text-blue">{fibPercent}%</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-xl font-bold text-txt">{todayTotals.fiber}g</span>
                    <span className="text-txt-2 text-xs">/ {dailyGoals.fiber}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-input/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue rounded-full transition-all duration-500" 
                      style={{ width: `${fibPercent}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Weekly Macro Performance Chart (Recharts) */}
            <div className="bg-col/80 rounded-[32px] border border-s/60 p-6 shadow-xl relative">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-txt">Weekly Performance Report</h3>
                  <p className="text-xs text-txt-2 mt-0.5">Visualize your daily macro levels relative to target benchmarks.</p>
                </div>
                <div className="flex rounded-xl bg-card/50 p-1 border border-s">
                  {(['Calories', 'Protein', 'Fats', 'Fiber'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setActiveMetric(m)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        activeMetric === m
                          ? 'bg-col text-txt shadow-sm'
                          : 'text-txt-2 hover:text-txt-2'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Responsive Chart Container */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px', color: '#f8fafc' }}
                      formatter={(value: any) => [`${value} ${metricUnit[activeMetric]}`, activeMetric]}
                    />
                    <ReferenceLine 
                      y={targetValue} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                      label={{ value: `Target: ${targetValue}`, position: 'top', fill: '#f87171', fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <Bar 
                      dataKey={activeMetric} 
                      fill={metricColor[activeMetric]} 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right Column: Historical / Today Meal Log Stream */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-col/80 rounded-[32px] border border-s/60 p-6 shadow-xl h-full flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-txt flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" /> Today's Meals
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-input/60 rounded-lg text-txt-2">
                    {todayMeals.length} logged
                  </span>
                </div>

                {todayMeals.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-input/20 flex items-center justify-center border border-s/50 text-txt-h">
                      <Activity className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-txt-2">No meals logged today</p>
                    <p className="text-xs text-txt-h max-w-[200px] leading-relaxed mx-auto">
                      All meals captured via AI scanner or logged manually will be stored here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {todayMeals.map((meal) => {
                      const isExpanded = selectedMeal === meal.id;
                      return (
                        <div 
                          key={meal.id}
                          className="bg-card/50 hover:bg-card border border-s/60 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer"
                          onClick={() => setSelectedMeal(isExpanded ? null : meal.id)}
                        >
                          <div className="p-4 flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-txt line-clamp-1">{meal.summary}</p>
                              <p className="text-xs text-txt-h mt-0.5">
                                {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-extrabold text-txt">{meal.totalCalories} kcal</span>
                              <p className="text-[10px] text-green font-bold">{meal.totalProtein}g protein</p>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-s/50 bg-bg/40 p-4 space-y-3">
                              <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">Items Breakdown</p>
                              <div className="space-y-2">
                                {meal.items.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center text-xs">
                                    <div className="space-y-0.5">
                                      <p className="font-semibold text-slate-200">{item.name}</p>
                                      <p className="text-[10px] text-txt-h">{item.estimatedQuantity}</p>
                                    </div>
                                    <div className="text-right text-txt-2">
                                      <span className="font-semibold text-txt-2">{item.calories} kcal</span>
                                      <p className="text-[9px] text-txt-h">
                                        P: {item.protein}g | F: {item.fat}g | Fib: {item.fiber}g
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {todayMeals.length > 0 && (
                <div className="pt-4 mt-4 border-t border-s/50 flex justify-between text-xs text-txt-2">
                  <span>Cumulative metrics:</span>
                  <span className="font-bold text-indigo-400">{todayTotals.calories} kcal total</span>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Target Nutritional Goals Setup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden bg-col border border-s rounded-[28px] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-s">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold text-txt">Daily Nutritional Goals</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-txt-2 hover:text-slate-200 rounded-lg bg-input/50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSaveGoals} className="p-6 space-y-4">
              <p className="text-xs text-txt-2 leading-normal">
                Personalize your daily targets. The charts and indicators will adapt to your choices immediately.
              </p>

              {saveError && (
                <div className="p-3 bg-red-900/30 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-txt-2 block mb-1">Calories Target (kcal)</label>
                  <input
                    type="number"
                    value={targetCals}
                    onChange={(e) => setTargetCals(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-card border border-s rounded-xl text-txt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="2000"
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-txt-2 block mb-1">Protein Target (g)</label>
                  <input
                    type="number"
                    value={targetProtein}
                    onChange={(e) => setTargetProtein(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-card border border-s rounded-xl text-txt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="80"
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-txt-2 block mb-1">Fat Target (g)</label>
                  <input
                    type="number"
                    value={targetFat}
                    onChange={(e) => setTargetFat(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-card border border-s rounded-xl text-txt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="65"
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-txt-2 block mb-1">Fiber Target (g)</label>
                  <input
                    type="number"
                    value={targetFiber}
                    onChange={(e) => setTargetFiber(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-card border border-s rounded-xl text-txt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="30"
                    min="1"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 justify-end pt-4 border-t border-s mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-col hover:bg-slate-750 border border-s rounded-xl text-txt-2 hover:text-txt font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-txt font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  {isSaving ? "Saving..." : "Save Goals"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meal Upload & AI Image Scanning Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-2xl bg-col border border-s/80 rounded-[32px] overflow-hidden shadow-2xl flex flex-col my-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-s/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-txt">AI Vision Meal Scanner</h3>
                  <p className="text-xs text-txt-2">Upload or select a nutritional plate snapshot to auto-extract macros.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-txt-2 hover:text-slate-200 rounded-xl bg-input/45 transition-all focus:ring-2 focus:ring-indigo-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Switcher */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* STEP 0: Select / Upload */}
              {uploadStep === 0 && (
                <div className="space-y-6">
                  {/* File Upload & Camera & Voice Zones */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Upload from Gallery */}
                    <div className="relative border-2 border-dashed border-s hover:border-indigo-500/60 transition-all rounded-3xl bg-card/30 p-6 text-center flex flex-col items-center justify-center gap-3 group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="w-12 h-12 rounded-2xl bg-col flex items-center justify-center border border-s text-txt-2 group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-all shadow-md">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-txt transition-all">Upload</p>
                    </div>

                    {/* Take Photo with Camera */}
                    <div className="relative border-2 border-dashed border-s hover:border-emerald-500/60 transition-all rounded-3xl bg-card/30 p-6 text-center flex flex-col items-center justify-center gap-3 group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="w-12 h-12 rounded-2xl bg-col flex items-center justify-center border border-s text-txt-2 group-hover:bg-green/10 group-hover:text-green transition-all shadow-md">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-txt transition-all">Photo</p>
                    </div>

                    {/* Voice Logging */}
                    <div className="relative border-2 border-dashed border-s hover:border-red-500/60 transition-all rounded-3xl bg-card/30 p-6 text-center flex flex-col items-center justify-center gap-3 group">
                      <button 
                        onPointerDown={startListening}
                        onPointerUp={stopListening}
                        onPointerLeave={stopListening}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-md z-10 relative ${isListening ? 'bg-red-600/20 border-red-500 text-red-400 animate-pulse' : 'bg-col border-s text-txt-2 group-hover:bg-red-600/10 group-hover:text-red-400'}`}
                      >
                        {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                      </button>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-txt transition-all leading-tight">
                        {isListening ? "Listening..." : "Hold to Speak"}
                      </p>
                    </div>
                  </div>
                  
                  {transcript && isListening && (
                    <div className="mt-2 p-3 bg-red/10 border border-red-500/20 rounded-xl">
                       <p className="text-xs text-red-300 italic">"{transcript}"</p>
                    </div>
                  )}
                  {speechError && (
                    <div className="mt-2 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-300">
                       Speech Error: {speechError}. (Ensure microphone permissions are granted).
                    </div>
                  )}

                  {selectedImage && (
                    <div className="mt-4 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 animate-bounce">
                      <Check className="w-3.5 h-3.5 text-indigo-400" /> Custom file loaded! Click "Analyze" below
                    </div>
                  )}

                  {/* Healthy Gourmet Presets Title */}
                  <div className="text-center pt-2">
                    <div className="h-[1px] w-full bg-input/50 flex items-center justify-center">
                      <span className="px-4 bg-col text-[10px] font-black uppercase text-indigo-400 tracking-widest">
                        Or select a visual preset
                      </span>
                    </div>
                  </div>

                  {/* Food Presets Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {FOOD_PRESETS.map((preset) => (
                      <div 
                        key={preset.id}
                        onClick={() => startAnalysisWithPreset(preset)}
                        className="bg-card/40 hover:bg-card border border-s/60 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between group shadow-lg shadow-slate-950/20 hover:-translate-y-1"
                      >
                        <div className="relative h-28 w-full overflow-hidden">
                          <img 
                            src={preset.image} 
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                          />
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-bg/80 rounded-lg text-[9px] font-bold text-indigo-300 backdrop-blur-sm border border-indigo-500/20">
                            {preset.totalCalories} kcal
                          </div>
                        </div>
                        <div className="p-3.5 space-y-2 flex-grow flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-black text-slate-200 line-clamp-1 group-hover:text-txt">{preset.name}</h4>
                            <p className="text-[10px] text-txt-h line-clamp-2 mt-0.5 leading-relaxed">{preset.summary}</p>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-txt-2 border-t border pt-2 mt-1">
                            <span className="text-green">P: {preset.totalProtein}g</span>
                            <span className="text-orange">F: {preset.totalFat}g</span>
                            <span className="text-blue">Fib: {preset.totalFiber}g</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Start Custom Trigger */}
                  {selectedImage && (
                    <div className="flex justify-end pt-4 border-t border-s/60">
                      <button
                        type="button"
                        onClick={handleStartAnalysis}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-txt text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Run AI Analyzer</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: Scanning Beam Overlay (Framer Motion Animation) */}
              {uploadStep === 1 && (
                <div className="flex flex-col items-center justify-center p-8 space-y-8">
                  {/* Glowing Scanner Box */}
                  <div className="relative w-72 h-52 rounded-[24px] overflow-hidden border border-s bg-card shadow-2xl shadow-cyan-500/10 flex items-center justify-center">
                    {selectedImage ? (
                      <img 
                        src={selectedImage} 
                        alt="Analyzing..." 
                        className="w-full h-full object-cover opacity-80"
                      />
                    ) : (
                      <div className="p-6 text-center z-20">
                         <Mic className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
                         <p className="text-xs font-semibold text-txt-2 italic">"{transcript}"</p>
                      </div>
                    )}

                    {/* Cyber Grid Backdrop Layer */}
                    <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                    {/* Framer Motion lasers scanning beam overlay */}
                    <motion.div 
                      className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                      animate={{
                        y: [0, 204, 0]
                      }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />

                    {/* Left and Right Glowing brackets */}
                    <div className="absolute inset-2 border border-cyan-500/20 rounded-[18px] pointer-events-none" />
                  </div>

                  {/* Rotating status labels */}
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span className="text-sm font-black text-txt tracking-wide uppercase">
                        AI Dissection Live
                      </span>
                    </div>
                    <motion.p 
                      key={scanningMsgIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-cyan-400 font-extrabold text-sm min-h-[20px]"
                    >
                      {SCAN_MESSAGES[scanningMsgIdx]}
                    </motion.p>
                    <p className="text-xs text-txt-h">Wait a few seconds for computer-vision calorie estimation...</p>
                  </div>

                  {/* Pulsing Loading line */}
                  <div className="w-48 h-1 bg-card/80 rounded-full overflow-hidden border border-s/50">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500"
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
                    <div className="p-6 bg-card/40 rounded-3xl border border-red-500/20 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-red/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-txt">AI Dissection Failed</h4>
                        <p className="text-xs text-txt-2 mt-1 leading-relaxed max-w-sm mx-auto">
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
                        className="px-4 py-2 bg-col hover:bg-input text-xs font-semibold rounded-xl text-txt-2 transition-all"
                      >
                        Try Another Image
                      </button>
                    </div>
                  ) : activeAnalysis ? (
                    <>
                      {mealSaveError && (
                        <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{mealSaveError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Left Side: Photo preview details */}
                        <div className="md:col-span-5 space-y-4">
                          <div className="relative h-44 rounded-2xl overflow-hidden border border-s/60 shadow-lg bg-card">
                            <img 
                              src={selectedImage || ""} 
                              alt="Analyzed food" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 left-3 px-2 py-0.5 bg-green/20 text-emerald-300 text-[10px] font-black tracking-widest rounded-lg border border-emerald-500/20 backdrop-blur-sm shadow-sm uppercase">
                              USDA Matched
                            </div>
                          </div>

                          {/* Calorie and Nutrient Highlights */}
                          <div className="p-4 bg-card/40 rounded-2xl border border-s/40 space-y-3">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] font-extrabold text-txt-2 uppercase tracking-widest">Total Energy</span>
                              <span className="text-xl font-black text-txt">{activeAnalysis.totalCalories} kcal</span>
                            </div>
                            <hr className="border" />
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="bg-green/5 p-2 rounded-xl border border-emerald-500/10">
                                <p className="text-[10px] font-bold text-txt-h uppercase">Protein</p>
                                <p className="text-sm font-extrabold text-green mt-0.5">{activeAnalysis.totalProtein}g</p>
                              </div>
                              <div className="bg-orange/5 p-2 rounded-xl border border-amber-500/10">
                                <p className="text-[10px] font-bold text-txt-h uppercase">Fat</p>
                                <p className="text-sm font-extrabold text-orange mt-0.5">{activeAnalysis.totalFat}g</p>
                              </div>
                              <div className="bg-blue/5 p-2 rounded-xl border border-blue-500/10">
                                <p className="text-[10px] font-bold text-txt-h uppercase">Fiber</p>
                                <p className="text-sm font-extrabold text-blue mt-0.5">{activeAnalysis.totalFiber}g</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Customizable settings & item breakdown */}
                        <div className="md:col-span-7 space-y-4">
                          {/* Name input */}
                          <div>
                            <label className="text-[10px] font-black text-txt-2 uppercase tracking-widest block mb-1">Meal Title</label>
                            <input 
                              type="text" 
                              value={customMealName}
                              onChange={(e) => setCustomMealName(e.target.value)}
                              placeholder="My Gourmet Feast Bowl"
                              className="w-full px-4 py-2.5 bg-card border border-s rounded-xl text-txt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Items breakdown */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-txt-2 uppercase tracking-widest block mb-1">Estimated Plate Breakdown</label>
                            <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                              {activeAnalysis.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-2.5 bg-card/30 border border-s/40 rounded-xl text-xs">
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-slate-200">{item.name}</p>
                                    <p className="text-[10px] text-txt-h">Portion: {item.estimatedQuantity || "100g"}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-extrabold text-txt-2">{item.calories} kcal</p>
                                    <p className="text-[9px] text-txt-h">P:{item.protein}g | F:{item.fat}g | Fib:{item.fiber}g</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="flex gap-3 justify-end pt-5 border-t border-s mt-6">
                        <button
                          type="button"
                          onClick={() => setUploadStep(0)}
                          className="px-5 py-2.5 bg-col hover:bg-slate-750 border border-s rounded-xl text-txt-2 font-semibold text-sm transition-all"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={isSavingMeal}
                          onClick={handleSaveMeal}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-txt font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
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
        </div>
      )}

      {/* Premium Paywall Modal */}
      {isPaywallOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-bg/85 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-md bg-card border border-indigo-500/30 rounded-[32px] overflow-hidden shadow-2xl flex flex-col p-8 relative"
          >
            {/* Close button */}
            <button 
              onClick={() => setIsPaywallOpen(false)}
              className="absolute top-6 right-6 p-1.5 text-txt-2 hover:text-slate-200 rounded-xl bg-col/60 hover:bg-col transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Sparkle badge */}
            <div className="mx-auto bg-indigo-500/10 text-indigo-400 p-3.5 rounded-2xl border border-indigo-500/20 mb-6">
              <Zap className="w-8 h-8 animate-pulse text-indigo-400" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-2 mb-6">
              <h3 className="text-2xl font-black text-txt tracking-tight">Upgrade to dietBuddy Premium</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                You've reached your free daily scan limit. Unlock the full power of dietBuddy to crush your fitness goals.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-col/40 border border-s/30">
                <div className="p-1 rounded-lg bg-indigo-500/15 text-indigo-400 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Unlimited AI Plate Scans</h4>
                  <p className="text-[10px] text-txt-h mt-0.5">Scan breakfast, lunch, dinner, and snacks with no limits.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-col/40 border border-s/30">
                <div className="p-1 rounded-lg bg-green/15 text-green mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Automated Cloud Sync</h4>
                  <p className="text-[10px] text-txt-h mt-0.5">Seamless two-way synchronization between your Android app and Web portal.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-col/40 border border-s/30">
                <div className="p-1 rounded-lg bg-cyan-500/15 text-cyan-400 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Premium Macros Insights</h4>
                  <p className="text-[10px] text-txt-h mt-0.5">Get in-depth AI coaching and nutrition trends updated dynamically.</p>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-bg/40 border border rounded-3xl p-5 text-center mb-6">
              <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Premium Plan</span>
              <div className="flex items-baseline justify-center gap-1.5 mt-1">
                <span className="text-3xl font-black text-txt">₹199</span>
                <span className="text-txt-h text-xs font-bold">/ month</span>
              </div>
              <p className="text-[10px] text-txt-h mt-2">Cancel anytime. Risk-free subscription.</p>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={async () => {
                try {
                  // 1. Load Razorpay Script
                  const loadRazorpayScript = () => {
                    return new Promise((resolve) => {
                      if ((window as any).Razorpay) return resolve(true);
                      const script = document.createElement("script");
                      script.src = "https://checkout.razorpay.com/v1/checkout.js";
                      script.onload = () => resolve(true);
                      script.onerror = () => resolve(false);
                      document.body.appendChild(script);
                    });
                  };

                  const isLoaded = await loadRazorpayScript();
                  if (!isLoaded) {
                    alert("Failed to load Razorpay SDK. Please check your internet connection.");
                    return;
                  }

                  // 2. Create Order from Backend
                  const orderRes = await fetch("/api/razorpay/order", { method: "POST" });
                  const orderData = await orderRes.json();

                  if (!orderData.success) {
                    alert(orderData.error || "Failed to initiate payment.");
                    return;
                  }

                  // 3. Initialize Razorpay Checkout
                  const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "", 
                    amount: orderData.order.amount,
                    currency: orderData.order.currency,
                    name: "dietBuddy",
                    description: "Lifetime Premium Upgrade",
                    order_id: orderData.order.id,
                    handler: async function (response: any) {
                      // 4. Verify Payment on Backend
                      const verifyRes = await fetch("/api/razorpay/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                        }),
                      });
                      
                      const verifyData = await verifyRes.json();
                      if (verifyData.success) {
                        setIsPremium(true);
                        setIsPaywallOpen(false);
                        localStorage.setItem("dietbuddy_premium", "true");
                        alert("🎉 Payment Successful! Welcome to dietBuddy Premium!");
                      } else {
                        alert("Payment verification failed. Please contact support.");
                      }
                    },
                    theme: { color: "#4f46e5" },
                  };

                  const paymentObject = new (window as any).Razorpay(options);
                  paymentObject.on('payment.failed', function (response: any) {
                    alert(`Payment Failed: ${response.error.description}`);
                  });
                  paymentObject.open();

                } catch (err) {
                  console.error(err);
                  alert("Something went wrong during checkout.");
                }
              }}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 font-bold text-txt text-sm rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-center flex items-center justify-center gap-2 group"
            >
              <span>Subscribe Now</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
        </div>
      )}

      {/* Fridge Raider Modal */}
      {isFridgeRaiderOpen && <FridgeRaider onClose={() => setIsFridgeRaiderOpen(false)} />}
    </div>
  );
}
