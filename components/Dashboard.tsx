"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import BottomNav from './BottomNav';
import ComingSoon from '@/components/ComingSoon';
import CameraModal, { SavedMealData } from '@/components/CameraModal';
import { useRouter } from 'next/navigation';
import { generateBuddyCoachTip } from '@/lib/nutritionEngine';
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
  Utensils,
  Edit2,
  Barcode,
  Maximize,
  User
} from 'lucide-react';
import dynamic from 'next/dynamic';
import HumanHero from './HumanHero';
import DailyCarousel from './DailyCarousel';
import { gradeMeal } from '@/lib/grading';

const WeeklyChart = dynamic(() => import('@/components/WeeklyChart'), { ssr: false });
import { saveDailyGoalsAction, saveMealAction, generateNutritionInsightAction, analyzeMealImageAction, analyzeMealTextAction } from "@/app/actions";
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from "next-auth/react";

export interface FoodItemData {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
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
  totalCarbs: number;
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
    carbs: number;
    fiber: number;
  };
  todayTotals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  };
  todayMeals: MealLogData[];
  onAddMealClick?: () => void;
  onRefreshClick?: () => void;
  activeStreak?: number;
  totalMealsCount?: number;
  weeklyData?: any[];
}

export default function Dashboard({
  userId = "guest-user-uuid",
  isPremiumUser = false,
  dailyGoals = { calories: 2000, protein: 80, fat: 65, carbs: 250, fiber: 30 },
  todayTotals: serverTotals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  todayMeals: initialMeals = [],
  onAddMealClick,
  onRefreshClick,
  activeStreak = 1,
  totalMealsCount = 0,
  weeklyData: serverWeeklyData = [],
}: DashboardProps) {

  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'Calories' | 'Protein' | 'Fats' | 'Carbs' | 'Fiber'>('Calories');

  // === NATIVE-APP CACHING LAYER ===
  const CACHE_KEY = `db_dash_${userId}`;

  const getCache = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed._date === new Date().toDateString()) return parsed;
      return null;
    } catch { return null; }
  };

  const cache = getCache();

  const [liveTotals, setLiveTotals] = useState(cache?.totals || serverTotals);
  const [liveMeals, setLiveMeals] = useState<MealLogData[]>(cache?.meals || initialMeals);
  const [liveWeeklyData, setLiveWeeklyData] = useState<any[]>(cache?.weekly || serverWeeklyData);
  const [liveMealCount, setLiveMealCount] = useState(cache?.mealCount || totalMealsCount);
  const [liveGoals, setLiveGoals] = useState(cache?.goals || dailyGoals);
  const [liveIsPremium, setLiveIsPremium] = useState(cache?.isPremium || isPremiumUser);
  const [liveActiveStreak, setLiveActiveStreak] = useState(cache?.activeStreak || activeStreak);
  const [isSyncing, setIsSyncing] = useState(false);

  // === BACKGROUND SYNC (APP SHELL) ===
  React.useEffect(() => {
    let mounted = true;
    async function syncData() {
      setIsSyncing(true);
      try {
        const { getDashboardDataAction } = await import('@/app/actions');
        const { calculateActiveStreak } = await import('@/lib/streak');
        const result = await getDashboardDataAction(userId);
        if (mounted && result.success && result.data) {
          const fetchedStreak = calculateActiveStreak(result.data.allUserMealTimestamps);
          setLiveTotals(result.data.todayTotals);
          setLiveMeals(result.data.todayMeals);
          setLiveWeeklyData(result.data.weeklyData);
          setLiveMealCount(result.data.allUserMealTimestamps.length);
          setLiveGoals(result.data.currentGoals);
          setLiveIsPremium(result.data.isPremium);
          setLiveActiveStreak(fetchedStreak);
          
          // Persist fresh data to cache
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            _date: new Date().toDateString(),
            totals: result.data.todayTotals,
            meals: result.data.todayMeals,
            weekly: result.data.weeklyData,
            mealCount: result.data.allUserMealTimestamps.length,
            goals: result.data.currentGoals,
            isPremium: result.data.isPremium,
            activeStreak: fetchedStreak,
          }));
        }
      } catch (err) {
        console.error("Background sync failed:", err);
      } finally {
        if (mounted) setIsSyncing(false);
      }
    }
    
    // Sync immediately on mount
    syncData();

    return () => { mounted = false; };
  }, [userId]);

  // Persist optimistic updates (when user adds a meal)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !isSyncing) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          _date: new Date().toDateString(),
          totals: liveTotals,
          meals: liveMeals,
          weekly: liveWeeklyData,
          mealCount: liveMealCount,
          goals: liveGoals,
          isPremium: liveIsPremium,
          activeStreak: liveActiveStreak,
        }));
      } catch {}
    }
  }, [liveTotals, liveMeals, liveWeeklyData, liveMealCount, liveGoals, liveIsPremium, liveActiveStreak, isSyncing]);

  // Alias for compatibility with existing template references
  const todayTotals = liveTotals;
  // Overwrite props with live state
  dailyGoals = liveGoals;
  isPremiumUser = liveIsPremium;
  activeStreak = liveActiveStreak;

  // AI-generated Nutrition Insight & Toast flags
  const [aiTip, setAiTip] = useState<string>("");
  const [isAiTipLoading, setAiTipLoading] = useState(false);
  const router = useRouter();
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
  }, [todayTotals.calories, todayTotals.protein, todayTotals.fat, todayTotals.carbs, todayTotals.fiber, dailyGoals.calories, dailyGoals.protein, userId]);

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
  const [targetCarbs, setTargetCarbs] = useState(dailyGoals.carbs.toString());
  const [targetFiber, setTargetFiber] = useState(dailyGoals.fiber.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Custom logging & camera scan states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeModalMode, setActiveModalMode] = useState<'camera' | 'speak' | 'barcode'>('camera');
  
  // Real AI scanning & paywall states
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Time hydration and Meal Details Modal
  const [mounted, setMounted] = useState(false);
  const [selectedMealForDetails, setSelectedMealForDetails] = useState<any | null>(null);
  const [isAllMealsModalOpen, setIsAllMealsModalOpen] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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



  // Recharts metric configuration
  const metricColor = {
    Calories: '#FC4C02',
    Protein: '#10b981',
    Fats: '#f59e0b',
    Carbs: '#8b5cf6',
    Fiber: '#3b82f6',
  };

  const metricUnit = {
    Calories: 'kcal',
    Protein: 'g',
    Fats: 'g',
    Carbs: 'g',
    Fiber: 'g',
  };

  const targetValue = {
    Calories: dailyGoals.calories,
    Protein: dailyGoals.protein,
    Fats: dailyGoals.fat,
    Carbs: dailyGoals.carbs,
    Fiber: dailyGoals.fiber,
  }[activeMetric];

  // Map 7-day reports  // Fallback to empty array if no weekly data provided
  const chartData = liveWeeklyData && liveWeeklyData.length > 0 ? liveWeeklyData : [];

  // Math percentages
  const calPercent = Math.min(100, Math.round((todayTotals.calories / dailyGoals.calories) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((todayTotals.protein / dailyGoals.protein) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((todayTotals.fat / dailyGoals.fat) * 100)) || 0;
  const carbPercent = Math.min(100, Math.round((todayTotals.carbs / dailyGoals.carbs) * 100)) || 0;
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
    <div className="min-h-screen bg-surface-muted text-ink font-sans pb-28">
      {/* Main Stats Panel Grid Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Concentric Progress Card, Coach, & Chart */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Top Header Section with HumanHero */}
            <div className="pt-10 pb-8 px-6 bg-white rounded-[40px] shadow-xl border border-surface-line relative z-10 flex flex-col items-center overflow-hidden">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="absolute top-6 right-6 w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center text-ink-soft hover:bg-surface-line transition-colors z-20 shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              
              <HumanHero fillPct={calPercent} />
              
              <div className="text-center z-10 flex flex-col items-center pt-8">
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Calories</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-5xl font-black tracking-tight text-ink">
                    {todayTotals.calories}
                  </span>
                  <span className="text-sm font-medium text-ink-soft">
                    / {dailyGoals.calories} kcal
                  </span>
                </div>
                <span className="text-[10px] font-bold text-ink-soft mt-3 uppercase tracking-widest bg-surface-muted px-3 py-1 rounded-full border border-surface-line">
                  {calsLeft} kcal left &middot; {calPercent}% fueled
                </span>
              </div>
            </div>

            {/* Swipeable Daily Card (Macros & Micros) */}
            <DailyCarousel todayTotals={todayTotals} dailyGoals={dailyGoals} />

            {/* Summary Callout Banner */}
            {todayTotals.calories === 0 ? (
              <div className="w-full p-5 rounded-2xl bg-brand-50 border border-brand-500/30 flex flex-col sm:flex-row gap-4 items-center justify-between group">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">Ready to start tracking?</p>
                    <p className="text-xs text-ink-soft mt-0.5">Log your first meal using the AI scanner or voice.</p>
                  </div>
                </div>
                <button 
                  onClick={onAddMealClick || (() => { setIsUploadModalOpen(true); setActiveModalMode('camera'); })}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2 whitespace-nowrap animate-pulse"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Meal
                </button>
              </div>
            ) : (
              <div className="w-full p-4 rounded-2xl bg-brand-50 border border-brand-500/20 flex gap-3 items-center">
                <Sparkles className="w-5 h-5 text-brand shrink-0" />
                <p className="text-xs text-ink-soft leading-normal">
                  {isOverCal 
                    ? "You have surpassed your daily target calories of energy intake."
                    : `Great job! You have reached ${calPercent}% of your active calorie tracking goal.`}
                </p>
              </div>
            )}
        
      {/* Buddy Coach Card */}
      <div className="bg-[#fff1ec] rounded-[24px] p-5 border border-[#ffdfd4] flex gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand/5 rounded-full blur-2xl"></div>
          <div className="w-10 h-10 bg-[#ffe5dc] rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-brand tracking-widest uppercase mb-1">Buddy Coach</span>
            <p className="text-sm font-medium text-ink leading-relaxed">
              {generateBuddyCoachTip(todayTotals, dailyGoals)}
            </p>
          </div>
        </div>

        {/* Weekly Macro Performance Chart (Recharts) */}
        <div className="bg-white rounded-[32px] border border-surface-line p-6 shadow-sm relative">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Weekly Performance</h3>
              <p className="text-xs text-ink-soft mt-0.5">Visualize your daily macro levels relative to target benchmarks.</p>
            </div>
            <div className="flex rounded-xl bg-surface-muted p-1 border border-surface-line w-full sm:w-auto overflow-x-auto custom-scrollbar">
              {(['Calories', 'Protein', 'Fats', 'Carbs', 'Fiber'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMetric(m)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap flex-1 sm:flex-none ${
                    activeMetric === m
                      ? 'bg-white text-ink shadow-sm border border-surface-line/50'
                      : 'text-ink-soft hover:text-ink-soft'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Responsive Chart Container */}
          <div className="h-56 w-full">
            <WeeklyChart 
              weeklyData={chartData} 
              activeMetric={activeMetric} 
              targetValue={targetValue} 
              metricUnit={metricUnit} 
              metricColor={metricColor} 
            />
          </div>
        </div>
      </div>

      {/* Right Column: Historical / Today Meal Log Stream */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-[32px] border border-surface-line p-6 shadow-sm h-full flex flex-col justify-start min-h-[400px]">

        {/* Today's Meals */}
        <div 
          className="flex justify-between items-center mb-5 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => setIsAllMealsModalOpen(true)}
        >
          <h2 className="text-xl font-black text-ink flex items-center gap-1">Today's meals <ChevronRight className="w-5 h-5 text-ink-soft" /></h2>
          <span className="text-xs font-bold text-ink-soft bg-white border border-surface-line px-3 py-1 rounded-full shadow-sm">
            {liveMeals.length} logged
          </span>
        </div>

        <div className="space-y-4">
          {liveMeals.length > 0 ? (
            liveMeals.map((meal: any) => {
              const { grade, color, textColor } = gradeMeal(meal);
              return (
              <div 
                key={meal.id} 
                onClick={() => setSelectedMealForDetails(meal)}
                className="bg-white rounded-[24px] p-4 flex items-center gap-4 shadow-sm border border-surface-line hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="w-16 h-16 bg-surface-muted rounded-2xl flex items-center justify-center shrink-0 border border-surface-line overflow-hidden relative">
                  <Image 
                    src={meal.imageUrl || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop"} 
                    alt={meal.summary}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {/* Grade Badge */}
                  <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-md ${color} flex items-center justify-center shadow-md`}>
                    <span className={`text-[10px] font-black ${textColor}`}>{grade}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-ink text-base truncate">{meal.summary || "Meal Log"}</h3>
                    <span className="text-ink-soft text-xs whitespace-nowrap ml-2">
                      {mounted ? new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                    <span className="text-[9px] font-bold text-ink-soft uppercase tracking-widest bg-surface-muted px-1.5 py-0.5 rounded-sm">{meal.mealSession || 'Snack'}</span>
                    <span className="text-emerald-500 font-bold ml-1">{meal.totalProtein}g protein</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-lg text-ink leading-none">{meal.totalCalories}</div>
                  <div className="text-[9px] font-bold text-ink-faint uppercase tracking-widest mt-1">Kcal</div>
                </div>
              </div>
            )})
          ) : (
            <div className="text-center py-10 bg-surface-muted rounded-[24px] border border-surface-line border-dashed">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-surface-line text-ink-faint mx-auto mb-3 shadow-sm">
                <Activity className="w-6 h-6" />
              </div>
              <p className="text-ink-soft font-bold text-sm">No meals logged yet today.</p>
              <p className="text-xs text-ink-faint max-w-[200px] leading-relaxed mx-auto mt-2">
                All meals captured via AI scanner or logged manually will be stored here.
              </p>
            </div>
          )}
        </div>
      </div>

      </div>
      </div>
      </div>

      <BottomNav onCameraClick={() => { setIsUploadModalOpen(true); setActiveModalMode('camera'); }} />

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

      {/* Meal Details Modal */}
      <AnimatePresence>
        {selectedMealForDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedMealForDetails(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-xl border border-surface-line relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-black text-ink">{selectedMealForDetails.summary}</h3>
                <button 
                  onClick={() => setSelectedMealForDetails(null)}
                  className="p-1 text-ink-soft hover:text-ink bg-surface-muted rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="w-full aspect-video bg-surface-muted rounded-2xl relative overflow-hidden mb-5">
                <Image 
                  src={selectedMealForDetails.imageUrl || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=300&fit=crop"} 
                  alt={selectedMealForDetails.summary}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-brand-50 rounded-xl p-2 text-center border border-brand-100">
                  <div className="text-[10px] font-bold text-brand uppercase tracking-wider mb-0.5">Kcal</div>
                  <div className="font-black text-brand text-sm">{selectedMealForDetails.totalCalories}</div>
                </div>
                <div className="bg-[#f0fdf4] rounded-xl p-2 text-center border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Pro</div>
                  <div className="font-black text-emerald-700 text-sm">{selectedMealForDetails.totalProtein}g</div>
                </div>
                <div className="bg-[#fffbeb] rounded-xl p-2 text-center border border-amber-100">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Fat</div>
                  <div className="font-black text-amber-700 text-sm">{selectedMealForDetails.totalFat}g</div>
                </div>
                <div className="bg-[#f5f3ff] rounded-xl p-2 text-center border border-purple-100">
                  <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Fib</div>
                  <div className="font-black text-purple-700 text-sm">{selectedMealForDetails.totalFiber}g</div>
                </div>
              </div>

              {selectedMealForDetails.items && selectedMealForDetails.items.length > 0 && (
                <div className="mt-4 border-t border-surface-line pt-4 max-h-[150px] overflow-y-auto">
                  <h4 className="text-xs font-bold text-ink-soft uppercase tracking-widest mb-3">Detected Items</h4>
                  <ul className="space-y-2">
                    {selectedMealForDetails.items.map((item: any) => (
                      <li key={item.id} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-ink">{item.name}</span>
                        <span className="text-ink-soft font-bold">{item.calories} kcal</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meal Upload & AI Image Scanning Modal */}
      <CameraModal 
        isOpen={isUploadModalOpen} 
        onClose={() => { setIsUploadModalOpen(false); setActiveModalMode('camera'); }} 
        userId={userId} 
        isPremiumUser={isPremium} 
        onMealSaved={(mealData: SavedMealData) => {
          // === INSTANT OPTIMISTIC UPDATE ===
          // 1. Inject the new meal at the top of the meal log
          const newMeal: MealLogData = {
            id: mealData.id,
            timestamp: mealData.timestamp,
            summary: mealData.summary,
            imageUrl: mealData.imageUrl,
            totalCalories: mealData.totalCalories,
            totalProtein: mealData.totalProtein,
            totalFat: mealData.totalFat,
            totalCarbs: mealData.totalCarbs,
            totalFiber: mealData.totalFiber,
            items: mealData.items.map((item, idx) => ({
              id: `opt-item-${idx}`,
              name: item.name,
              calories: item.calories,
              protein: item.protein,
              fat: item.fat,
              carbs: item.carbs,
              fiber: item.fiber,
              estimatedQuantity: item.estimatedQuantity,
            })),
          };
          setLiveMeals(prev => [newMeal, ...prev]);

          // 2. Update today's totals instantly
          setLiveTotals(prev => ({
            calories: prev.calories + mealData.totalCalories,
            protein: prev.protein + mealData.totalProtein,
            fat: prev.fat + mealData.totalFat,
            carbs: prev.carbs + mealData.totalCarbs,
            fiber: prev.fiber + mealData.totalFiber,
          }));

          // 3. Update the weekly chart for today
          setLiveWeeklyData(prev => {
            if (!prev || prev.length === 0) return prev;
            const updated = [...prev];
            const todayEntry = updated[updated.length - 1]; // last entry is today
            if (todayEntry) {
              updated[updated.length - 1] = {
                ...todayEntry,
                Calories: (todayEntry.Calories || 0) + mealData.totalCalories,
                Protein: (todayEntry.Protein || 0) + mealData.totalProtein,
                Fats: (todayEntry.Fats || 0) + mealData.totalFat,
                Carbs: (todayEntry.Carbs || 0) + mealData.totalCarbs,
                Fiber: (todayEntry.Fiber || 0) + mealData.totalFiber,
              };
            }
            return updated;
          });

          // 4. Update total meal count
          setLiveMealCount(prev => prev + 1);

          // 5. Background refresh to sync server state (invisible to user)
          router.refresh();
        }} 
      />

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
                <span className="text-ink-faint text-xs font-bold">/ 6 months</span>
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

      {/* All Meals Modal */}
      {isAllMealsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg overflow-hidden bg-surface border border-surface-line rounded-[28px] shadow-2xl my-8">
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-surface/90 backdrop-blur-md border-b border-surface-line">
              <h3 className="font-display text-xl font-bold text-ink">All Meals</h3>
              <button 
                onClick={() => setIsAllMealsModalOpen(false)}
                className="p-2 text-ink-soft hover:text-ink rounded-full hover:bg-surface-muted transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(session => {
                const sessionMeals = liveMeals.filter((m: any) => (m.mealSession || 'Snack') === session);
                if (sessionMeals.length === 0) return null;
                
                const sessionCalories = sessionMeals.reduce((acc: number, m: any) => acc + m.totalCalories, 0);

                return (
                  <div key={session} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-surface-line pb-2">
                      <h4 className="font-bold text-ink text-lg">{session}</h4>
                      <span className="text-sm font-bold text-ink-soft">{sessionCalories} kcal</span>
                    </div>
                    <div className="space-y-3">
                      {sessionMeals.map((meal: any) => {
                        const { grade, color, textColor } = gradeMeal(meal);
                        return (
                          <div 
                            key={meal.id}
                            onClick={() => {
                              setSelectedMealForDetails(meal);
                            }}
                            className="bg-surface-muted rounded-2xl p-3 flex items-center gap-3 border border-surface-line cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl overflow-hidden relative shrink-0">
                              <Image 
                                src={meal.imageUrl || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop"} 
                                alt={meal.summary}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <div className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-sm ${color} flex items-center justify-center`}>
                                <span className={`text-[8px] font-black ${textColor}`}>{grade}</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-ink text-sm truncate">{meal.summary}</h5>
                              <div className="flex gap-2 text-[10px] text-ink-soft font-medium mt-1">
                                <span>{meal.totalProtein}g protein</span>
                                <span>&middot;</span>
                                <span>{meal.totalCarbs}g carbs</span>
                                <span>&middot;</span>
                                <span>{meal.totalFat}g fat</span>
                              </div>
                            </div>
                            <div className="font-black text-ink">{meal.totalCalories}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {liveMeals.length === 0 && (
                <div className="text-center py-8 text-ink-soft">
                  <p>No meals logged yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
