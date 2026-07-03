"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import BottomNav from './BottomNav';
import ComingSoon from '@/components/ComingSoon';
import CameraModal from '@/components/CameraModal';
import { useRouter } from 'next/navigation';
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
  todayMeals: initialMeals = [],
  onAddMealClick,
  onRefreshClick,
  activeStreak = 1,
  totalMealsCount = 0,
}: DashboardProps) {

  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'Calories' | 'Protein' | 'Fats' | 'Fiber'>('Calories');

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
  const [activeModalMode, setActiveModalMode] = useState<'camera' | 'speak' | 'barcode'>('camera');
  
  // Real AI scanning & paywall states
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
    <div className="min-h-screen bg-surface-muted text-ink font-sans pb-28">
      {/* Main Stats Panel Grid Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Concentric Progress Card, Coach, & Chart */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Top Header Section with massive circular progress */}
            <div className="pt-10 pb-8 px-6 bg-white rounded-[40px] shadow-xl border border-surface-line relative z-10 flex flex-col items-center overflow-hidden">
              
              {/* Edit Goals Button */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="absolute top-6 right-6 w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center text-ink-soft hover:bg-surface-line transition-colors z-20 shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Highlight background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        {/* Massive Circular Progress */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Realistic SVG Ring */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-xl" style={{ filter: "drop-shadow(0px 10px 15px rgba(252, 76, 2, 0.2))" }}>
            <defs>
              <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff7b47" />
                <stop offset="100%" stopColor="#FC4C02" />
              </linearGradient>
            </defs>
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="#F3F4F6"
              strokeWidth="20"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="url(#calGradient)"
              strokeWidth="20"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          <div className="text-center z-10 flex flex-col items-center pt-1">
            <span className="text-4xl font-black leading-none tracking-tight text-ink">
              {todayTotals.calories}
            </span>
            <span className="text-xs font-medium text-ink-soft mt-1">
              / {dailyGoals.calories} kcal
            </span>
            <span className="text-[10px] font-bold text-ink-faint mt-1.5 uppercase tracking-widest bg-surface-muted px-2 py-0.5 rounded-full">
              {calsLeft} kcal left
            </span>
          </div>
        </div>

        {/* 3 Circular Macro Cards (Protein, Fat, Fiber) */}
        <div className="flex w-full gap-4 mt-8 justify-center px-2">
          
          {/* Protein Circle */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-surface shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] border border-surface-line">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient id="prot-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <circle cx="40" cy="40" r="32" stroke="transparent" strokeWidth="8" fill="transparent" />
                <circle
                  cx="40" cy="40" r="32"
                  stroke="url(#prot-grad)" strokeWidth="8" fill="transparent" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={(2 * Math.PI * 32) * (1 - (protPercent / 100))}
                  className="transition-all duration-1000 ease-out drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]"
                />
              </svg>
              <div className="text-center z-10 flex flex-col items-center mt-0.5">
                <span className="text-xs font-black text-ink">{todayTotals.protein}g</span>
                <span className="text-[9px] font-bold text-ink-soft -mt-0.5">{protPercent}%</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-ink-soft tracking-widest uppercase">Protein</span>
          </div>

          {/* Fat Circle */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-surface shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] border border-surface-line">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient id="fat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
                <circle cx="40" cy="40" r="32" stroke="transparent" strokeWidth="8" fill="transparent" />
                <circle
                  cx="40" cy="40" r="32"
                  stroke="url(#fat-grad)" strokeWidth="8" fill="transparent" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={(2 * Math.PI * 32) * (1 - (fatPercent / 100))}
                  className="transition-all duration-1000 ease-out drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]"
                />
              </svg>
              <div className="text-center z-10 flex flex-col items-center mt-0.5">
                <span className="text-xs font-black text-ink">{todayTotals.fat}g</span>
                <span className="text-[9px] font-bold text-ink-soft -mt-0.5">{fatPercent}%</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-ink-soft tracking-widest uppercase">Fat</span>
          </div>

          {/* Fiber Circle */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-surface shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] border border-surface-line">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient id="fib-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <circle cx="40" cy="40" r="32" stroke="transparent" strokeWidth="8" fill="transparent" />
                <circle
                  cx="40" cy="40" r="32"
                  stroke="url(#fib-grad)" strokeWidth="8" fill="transparent" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={(2 * Math.PI * 32) * (1 - (fibPercent / 100))}
                  className="transition-all duration-1000 ease-out drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]"
                />
              </svg>
              <div className="text-center z-10 flex flex-col items-center mt-0.5">
                <span className="text-xs font-black text-ink">{todayTotals.fiber}g</span>
                <span className="text-[9px] font-bold text-ink-soft -mt-0.5">{fibPercent}%</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-ink-soft tracking-widest uppercase">Fiber</span>
          </div>

        </div>

        {/* Summary Callout Banner */}
        {todayTotals.calories === 0 ? (
          <div className="mt-8 w-full p-5 rounded-2xl bg-brand-50 border border-brand-500/30 flex flex-col sm:flex-row gap-4 items-center justify-between group">
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
          <div className="mt-8 w-full p-4 rounded-2xl bg-brand-50 border border-brand-500/20 flex gap-3 items-center">
            <Sparkles className="w-5 h-5 text-brand shrink-0" />
            <p className="text-xs text-ink-soft leading-normal">
              {isOverCal 
                ? "You have surpassed your daily target calories of energy intake."
                : `Great job! You have reached ${calPercent}% of your active calorie tracking goal.`}
            </p>
          </div>
        )}
        </div>
        
      {/* Buddy Coach Card */}
      <div className="bg-[#fff1ec] rounded-[24px] p-5 border border-[#ffdfd4] flex gap-4 shadow-sm relative overflow-hidden">
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

        {/* Weekly Macro Performance Chart (Recharts) */}
        <div className="bg-white rounded-[32px] border border-surface-line p-6 shadow-sm relative">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Weekly Performance</h3>
              <p className="text-xs text-ink-soft mt-0.5">Visualize your daily macro levels relative to target benchmarks.</p>
            </div>
            <div className="flex rounded-xl bg-surface-muted p-1 border border-surface-line w-full sm:w-auto overflow-x-auto custom-scrollbar">
              {(['Calories', 'Protein', 'Fats', 'Fiber'] as const).map((m) => (
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
              weeklyData={weeklyData} 
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
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black text-ink">Today's meals</h2>
          <span className="text-xs font-bold text-ink-soft bg-white border border-surface-line px-3 py-1 rounded-full shadow-sm">
            {initialMeals.length} logged
          </span>
        </div>

        <div className="space-y-4">
          {initialMeals.length > 0 ? (
            initialMeals.map((meal: any) => (
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
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-ink text-base truncate">{meal.summary || "Meal Log"}</h3>
                    <span suppressHydrationWarning className="text-ink-soft text-xs whitespace-nowrap ml-2">
                      {new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs font-medium">
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

      {/* Meal Upload & AI Image Scanning Modal */}
      <CameraModal 
        isOpen={isUploadModalOpen} 
        onClose={() => { setIsUploadModalOpen(false); setActiveModalMode('camera'); }} 
        userId={userId} 
        isPremiumUser={isPremium} 
        onMealSaved={() => router.refresh()} 
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
    </div>
  );
}
