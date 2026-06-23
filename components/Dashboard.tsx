"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import BottomNav from './BottomNav';
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
  imageUrl?: string;
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
    Calories: '#FC4C02',
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

  const calsLeft = Math.max(0, dailyGoals.calories - todayTotals.calories);
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28">
      {/* Top Header Section with massive circular progress */}
      <div className="pt-12 pb-8 px-6 bg-white rounded-b-[40px] shadow-[0_8px_32px_rgba(0,0,0,0.03)] border-b border-surface-line relative z-10 flex flex-col items-center">
        
        {/* Massive Circular Progress */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* SVG Ring */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="#F3F4F6"
              strokeWidth="24"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="#FC4C02"
              strokeWidth="24"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          <div className="text-center z-10 flex flex-col items-center pt-2">
            <span className="text-[72px] font-black leading-none tracking-tight text-ink">
              {todayTotals.calories}
            </span>
            <span className="text-sm font-medium text-ink-soft mt-1">
              of {dailyGoals.calories} kcal
            </span>
            <span className="text-sm font-bold text-ink-faint mt-2 font-mono tracking-widest">
              {calsLeft} kcal left
            </span>
          </div>
        </div>

        {/* 3 Pill Cards (Protein, Fat, Fiber) */}
        <div className="flex w-full gap-3 mt-10 justify-center">
          
          {/* Protein */}
          <div className="flex-1 bg-surface rounded-3xl p-4 border border-surface-line shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase">Protein</span>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-black text-ink">{todayTotals.protein}</span>
              <span className="text-sm text-ink-faint">/{dailyGoals.protein}g</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${protPercent}%` }}></div>
            </div>
          </div>

          {/* Fat */}
          <div className="flex-1 bg-surface rounded-3xl p-4 border border-surface-line shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase">Fat</span>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-black text-ink">{todayTotals.fat}</span>
              <span className="text-sm text-ink-faint">/{dailyGoals.fat}g</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fatPercent}%` }}></div>
            </div>
          </div>

          {/* Fiber */}
          <div className="flex-1 bg-surface rounded-3xl p-4 border border-surface-line shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div>
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase">Fiber</span>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-black text-ink">{todayTotals.fiber}</span>
              <span className="text-sm text-ink-faint">/{dailyGoals.fiber}g</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${fibPercent}%` }}></div>
            </div>
          </div>

        </div>
      </div>

      <div className="px-6 py-8 max-w-lg mx-auto">
        
        {/* Buddy Coach Card */}
        <div className="bg-[#fff1ec] rounded-[24px] p-5 border border-[#ffdfd4] flex gap-4 mb-10 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand/5 rounded-full blur-2xl"></div>
          <div className="w-10 h-10 bg-[#ffe5dc] rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-brand tracking-widest uppercase mb-1">Buddy Coach</span>
            <p className="text-sm font-medium text-ink leading-relaxed">
              You're at {todayTotals.protein}g protein — a chicken or tofu plate at dinner gets you to goal.
            </p>
          </div>
        </div>

        {/* Today's Meals */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black text-ink">Today's meals</h2>
          <span className="text-xs font-bold text-ink-soft bg-white border border-surface-line px-3 py-1 rounded-full shadow-sm">
            {todayMeals.length} logged
          </span>
        </div>

        <div className="space-y-4">
          {todayMeals.length > 0 ? (
            todayMeals.map(meal => (
              <div key={meal.id} className="bg-white rounded-[24px] p-4 flex items-center gap-4 shadow-sm border border-surface-line hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-16 h-16 bg-surface-muted rounded-2xl flex items-center justify-center shrink-0 border border-surface-line overflow-hidden relative">
                  <Image 
                    src={meal.imageUrl || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop"} 
                    alt={meal.summary}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink text-base truncate">{meal.summary || "Meal Log"}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                    <span className="text-ink-soft">{new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="text-ink-soft">•</span>
                    <span className="text-emerald-500 font-bold">{meal.totalProtein}g protein</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-lg text-ink leading-none">{meal.totalCalories}</div>
                  <div className="text-[9px] font-bold text-ink-faint uppercase tracking-widest mt-1">Kcal</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-[32px] border border-surface-line border-dashed">
              <p className="text-ink-soft font-medium text-sm">No meals logged yet today.</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav onCameraClick={() => setIsUploadModalOpen(true)} />

      {/* Target Nutritional Goals Setup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden bg-surface-muted border border-surface-line rounded-[28px] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-line">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-brand" />
                <h3 className="font-display text-lg font-bold text-ink">Daily Nutritional Goals</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-ink-soft hover:text-ink rounded-lg bg-surface-line transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSaveGoals} className="p-6 space-y-4">
              <p className="text-xs text-ink-soft leading-normal">
                Personalize your daily targets. The charts and indicators will adapt to your choices immediately.
              </p>

              {saveError && (
                <div className="p-3 bg-red-900/30 border border-red-500/20 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-ink-soft block mb-1">Calories Target (kcal)</label>
                  <input
                    type="number"
                    value={targetCals}
                    onChange={(e) => setTargetCals(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-surface-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="2000"
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-soft block mb-1">Protein Target (g)</label>
                  <input
                    type="number"
                    value={targetProtein}
                    onChange={(e) => setTargetProtein(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-surface-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="80"
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-soft block mb-1">Fat Target (g)</label>
                  <input
                    type="number"
                    value={targetFat}
                    onChange={(e) => setTargetFat(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-surface-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="65"
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-soft block mb-1">Fiber Target (g)</label>
                  <input
                    type="number"
                    value={targetFiber}
                    onChange={(e) => setTargetFiber(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-surface-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="30"
                    min="1"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 justify-end pt-4 border-t border-surface-line mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-surface-muted hover:bg-surface-muted border border-surface-line rounded-xl text-ink-soft hover:text-ink font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto">
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
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-ink-soft hover:text-ink rounded-xl bg-surface-line transition-all focus:ring-2 focus:ring-brand-500"
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
                    <div className="relative border-2 border-dashed border-surface-line hover:border-brand-500/60 transition-all rounded-3xl bg-surface-muted p-6 text-center flex flex-col items-center justify-center gap-3 group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center border border-surface-line text-ink-soft group-hover:bg-brand-50 group-hover:text-brand transition-all shadow-md">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-ink group-hover:text-ink transition-all">Upload</p>
                    </div>

                    {/* Take Photo with Camera */}
                    <div className="relative border-2 border-dashed border-surface-line hover:border-emerald-500/60 transition-all rounded-3xl bg-surface-muted p-6 text-center flex flex-col items-center justify-center gap-3 group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center border border-surface-line text-ink-soft group-hover:bg-emerald-600/10 group-hover:text-emerald-600 transition-all shadow-md">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-ink group-hover:text-ink transition-all">Photo</p>
                    </div>

                    {/* Voice Logging */}
                    <div className="relative border-2 border-dashed border-surface-line hover:border-red-500/60 transition-all rounded-3xl bg-surface-muted p-6 text-center flex flex-col items-center justify-center gap-3 group">
                      <button 
                        onPointerDown={startListening}
                        onPointerUp={stopListening}
                        onPointerLeave={stopListening}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-md z-10 relative ${isListening ? 'bg-red-600/20 border-red-500 text-red-600 animate-pulse' : 'bg-surface-muted border-surface-line text-ink-soft group-hover:bg-red-600/10 group-hover:text-red-600'}`}
                      >
                        {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                      </button>
                      <p className="text-sm font-bold text-ink group-hover:text-ink transition-all leading-tight">
                        {isListening ? "Listening..." : "Hold to Speak"}
                      </p>
                    </div>
                  </div>
                  
                  {transcript && isListening && (
                    <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                       <p className="text-xs text-red-600 italic">"{transcript}"</p>
                    </div>
                  )}
                  {speechError && (
                    <div className="mt-2 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-600">
                       Speech Error: {speechError}. (Ensure microphone permissions are granted).
                    </div>
                  )}

                  {selectedImage && (
                    <div className="mt-4 px-4 py-2 rounded-2xl bg-brand-50 border border-brand-500/20 text-brand-600 text-xs font-semibold flex items-center gap-1.5 animate-bounce">
                      <Check className="w-3.5 h-3.5 text-brand" /> Custom file loaded! Click "Analyze" below
                    </div>
                  )}

                  {/* Healthy Gourmet Presets Title */}
                  <div className="text-center pt-2">
                    <div className="h-[1px] w-full bg-surface-line flex items-center justify-center">
                      <span className="px-4 bg-surface-muted text-[10px] font-black uppercase text-brand tracking-widest">
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
                        className="bg-surface-muted hover:bg-surface-muted border border-surface-line hover:border-brand-500/50 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between group shadow-lg shadow-slate-950/20 hover:-translate-y-1"
                      >
                        <div className="relative h-28 w-full overflow-hidden">
                          <img 
                            src={preset.image} 
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                          />
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 rounded-lg text-[9px] font-bold text-brand-600 backdrop-blur-sm border border-brand-500/20">
                            {preset.totalCalories} kcal
                          </div>
                        </div>
                        <div className="p-3.5 space-y-2 flex-grow flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-black text-ink line-clamp-1 group-hover:text-ink">{preset.name}</h4>
                            <p className="text-[10px] text-ink-faint line-clamp-2 mt-0.5 leading-relaxed">{preset.summary}</p>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-ink-soft border-t border-surface-line pt-2 mt-1">
                            <span className="text-emerald-600">P: {preset.totalProtein}g</span>
                            <span className="text-amber-600">F: {preset.totalFat}g</span>
                            <span className="text-blue-600">Fib: {preset.totalFiber}g</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Start Custom Trigger */}
                  {selectedImage && (
                    <div className="flex justify-end pt-4 border-t border-surface-line">
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
                </div>
              )}

              {/* STEP 1: Scanning Beam Overlay (Framer Motion Animation) */}
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
                         <Mic className="w-12 h-12 text-brand mx-auto mb-4 animate-pulse" />
                         <p className="text-xs font-semibold text-ink-soft italic">"{transcript}"</p>
                      </div>
                    )}

                    {/* Cyber Grid Backdrop Layer */}
                    <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                    {/* Framer Motion lasers scanning beam overlay */}
                    <motion.div 
                      className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)]"
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
                    <div className="absolute inset-2 border border-brand/20 rounded-[18px] pointer-events-none" />
                  </div>

                  {/* Rotating status labels */}
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 text-brand animate-spin" />
                      <span className="text-sm font-black text-ink tracking-wide uppercase">
                        AI Dissection Live
                      </span>
                    </div>
                    <motion.p 
                      key={scanningMsgIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-brand font-extrabold text-sm min-h-[20px]"
                    >
                      {SCAN_MESSAGES[scanningMsgIdx]}
                    </motion.p>
                    <p className="text-xs text-ink-faint">Wait a few seconds for computer-vision calorie estimation...</p>
                  </div>

                  {/* Pulsing Loading line */}
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
                          <div className="relative h-44 rounded-2xl overflow-hidden border border-surface-line shadow-lg bg-white">
                            <img 
                              src={selectedImage || ""} 
                              alt="Analyzed food" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 left-3 px-2 py-0.5 bg-emerald-500/20 text-emerald-600 text-[10px] font-black tracking-widest rounded-lg border border-emerald-500/20 backdrop-blur-sm shadow-sm uppercase">
                              USDA Matched
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
        </div>
      )}

      {/* Premium Paywall Modal */}
      {isPaywallOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-md bg-white border border-brand-500/30 rounded-[32px] overflow-hidden shadow-2xl flex flex-col p-8 relative"
          >
            {/* Close button */}
            <button 
              onClick={() => setIsPaywallOpen(false)}
              className="absolute top-6 right-6 p-1.5 text-ink-soft hover:text-ink rounded-xl bg-white hover:bg-surface-muted transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Sparkle badge */}
            <div className="mx-auto bg-brand-50 text-brand p-3.5 rounded-2xl border border-brand-500/20 mb-6">
              <Zap className="w-8 h-8 animate-pulse text-brand" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-2 mb-6">
              <h3 className="font-display text-2xl font-black text-ink tracking-tight">Upgrade to dietBuddy Premium</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                You've reached your free daily scan limit. Unlock the full power of dietBuddy to crush your fitness goals.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-surface-line">
                <div className="p-1 rounded-lg bg-brand-100 text-brand mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">Unlimited AI Plate Scans</h4>
                  <p className="text-[10px] text-ink-faint mt-0.5">Scan breakfast, lunch, dinner, and snacks with no limits.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-surface-line">
                <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-600 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">Automated Cloud Sync</h4>
                  <p className="text-[10px] text-ink-faint mt-0.5">Seamless two-way synchronization between your Android app and Web portal.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-surface-line">
                <div className="p-1 rounded-lg bg-cyan-500/15 text-brand mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">Premium Macros Insights</h4>
                  <p className="text-[10px] text-ink-faint mt-0.5">Get in-depth AI coaching and nutrition trends updated dynamically.</p>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-surface-muted border border-surface-line rounded-3xl p-5 text-center mb-6">
              <span className="text-[10px] font-black tracking-widest text-brand uppercase">Premium Plan</span>
              <div className="flex items-baseline justify-center gap-1.5 mt-1">
                <span className="font-display text-3xl font-black text-ink">₹199</span>
                <span className="text-ink-faint text-xs font-bold">/ month</span>
              </div>
              <p className="text-[10px] text-ink-faint mt-2">Cancel anytime. Risk-free subscription.</p>
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
              className="w-full py-4 bg-brand-600 hover:bg-brand-500 font-bold text-white text-sm rounded-2xl transition-all shadow-lg shadow-brand-600/30 text-center flex items-center justify-center gap-2 group"
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
