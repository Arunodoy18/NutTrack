"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, Activity, Target, ChevronRight, Flame, Dumbbell } from 'lucide-react';

interface BodyProfileModalProps {
  onClose: () => void;
  onGoalsCalculated: (goals: { calories: number; protein: number; fat: number; fiber: number; sodium?: number; iron?: number; calcium?: number; vitaminC?: number; }) => void;
}

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type FitnessGoal = 'cut' | 'maintain' | 'bulk';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (Office job, no exercise)",
  light: "Light (1-2 workouts/week)",
  moderate: "Moderate (3-5 workouts/week)",
  active: "Active (6-7 workouts/week)",
  very_active: "Athlete (2x daily training)",
};

const GOAL_LABELS: Record<FitnessGoal, { label: string; emoji: string; desc: string }> = {
  cut: { label: "Cut", emoji: "🔥", desc: "Lose fat, preserve muscle" },
  maintain: { label: "Maintain", emoji: "⚖️", desc: "Stay at current weight" },
  bulk: { label: "Bulk", emoji: "💪", desc: "Build muscle, gain weight" },
};

export default function BodyProfileModal({ onClose, onGoalsCalculated }: BodyProfileModalProps) {
  const [step, setStep] = useState(0); // 0=body, 1=activity, 2=goal, 3=results
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('22');
  const [weight, setWeight] = useState('70'); // kg
  const [height, setHeight] = useState('170'); // cm
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('maintain');

  // Calculated values
  const [bmr, setBmr] = useState(0);
  const [tdee, setTdee] = useState(0);
  const [targetCalories, setTargetCalories] = useState(0);
  const [targetProtein, setTargetProtein] = useState(0);
  const [targetFat, setTargetFat] = useState(0);
  const [targetFiber, setTargetFiber] = useState(0);

  // Safe local storage helper
  const safeStorage = {
    get: (key: string) => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key: string, value: string) => { try { localStorage.setItem(key, value); } catch {} }
  };

  // Load saved profile
  useEffect(() => {
    const saved = safeStorage.get('dietbuddy_body_profile');
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        if (profile.gender) setGender(profile.gender);
        if (profile.age) setAge(profile.age);
        if (profile.weight) setWeight(profile.weight);
        if (profile.height) setHeight(profile.height);
        if (profile.activityLevel) setActivityLevel(profile.activityLevel);
        if (profile.fitnessGoal) setFitnessGoal(profile.fitnessGoal);
      } catch {}
    }
  }, []);

  const calculateAll = () => {
    const w = parseFloat(weight) || 70;
    const h = parseFloat(height) || 170;
    const a = parseInt(age) || 22;

    // Mifflin-St Jeor Equation (gold standard for BMR)
    let calculatedBmr: number;
    if (gender === 'male') {
      calculatedBmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      calculatedBmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    }
    setBmr(Math.round(calculatedBmr));

    // TDEE = BMR × Activity Multiplier
    const calculatedTdee = calculatedBmr * ACTIVITY_MULTIPLIERS[activityLevel];
    setTdee(Math.round(calculatedTdee));

    // Goal-based calorie adjustment
    let calories: number;
    if (fitnessGoal === 'cut') {
      calories = calculatedTdee - 500; // 500 cal deficit = ~0.5kg/week loss
    } else if (fitnessGoal === 'bulk') {
      calories = calculatedTdee + 300; // 300 cal surplus = lean bulk
    } else {
      calories = calculatedTdee;
    }
    setTargetCalories(Math.round(calories));

    // Macro Split based on goal
    let proteinPerKg: number;
    let fatPercent: number;

    if (fitnessGoal === 'cut') {
      proteinPerKg = 2.2; // High protein to preserve muscle during cut
      fatPercent = 0.25;   // 25% calories from fat
    } else if (fitnessGoal === 'bulk') {
      proteinPerKg = 1.8;  // Moderate-high protein for muscle building
      fatPercent = 0.25;    // 25% from fat
    } else {
      proteinPerKg = 2.0;  // Standard fitness protein
      fatPercent = 0.30;    // 30% from fat
    }

    const protein = Math.round(w * proteinPerKg);
    const fat = Math.round((calories * fatPercent) / 9); // 9 cal per gram of fat
    const fiber = Math.round(w * 0.4); // ~0.4g per kg is a solid target

    setTargetProtein(protein);
    setTargetFat(fat);
    setTargetFiber(fiber);

    // Save profile to localStorage safely
    safeStorage.set('dietbuddy_body_profile', JSON.stringify({
      gender, age, weight, height, activityLevel, fitnessGoal
    }));

    setStep(3);
  };

  const handleApplyGoals = () => {
    onGoalsCalculated({
      calories: targetCalories,
      protein: targetProtein,
      fat: targetFat,
      fiber: targetFiber,
      sodium: 2300,
      iron: gender === 'female' ? 18 : 8,
      calcium: 1000,
      vitaminC: 90
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#3D3B38]/60 backdrop-blur-sm">
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-lg bg-[#FFFFFF] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-[#EBE8E0]">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-[#635BFF]" />
            <h3 className="text-[15px] font-black text-[#3D3B38]">Body Profile & Goals</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F7F5F0] text-[#3D3B38]"><X size={16}/></button>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 py-4">
          {[0,1,2,3].map(i => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#635BFF]' : i < step ? 'w-4 bg-[#83B593]' : 'w-4 bg-[#EBE8E0]'}`} />
          ))}
        </div>

        <div className="p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* STEP 0: Body Stats */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-5">
                <div className="text-center mb-2">
                  <h4 className="text-lg font-black text-[#3D3B38]">Your Body Stats</h4>
                  <p className="text-sm font-bold text-[#8D8B86]">Used for precise BMR calculation</p>
                </div>

                <div className="flex gap-3">
                  {(['male', 'female'] as Gender[]).map(g => (
                    <button key={g} onClick={() => setGender(g)} className={`flex-1 py-4 rounded-2xl font-bold text-base border transition-all ${gender === g ? 'bg-[#635BFF] text-white border-[#635BFF] shadow-lg' : 'bg-[#F7F5F0] text-[#3D3B38] border-[#EBE8E0]'}`}>
                      {g === 'male' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-black text-[#8D8B86] uppercase block mb-1">Age</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-[#F7F5F0] border border-[#EBE8E0] px-3 py-3 rounded-xl text-base font-bold text-[#3D3B38] text-center focus:outline-none focus:border-[#635BFF]" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-[#8D8B86] uppercase block mb-1">Weight (kg)</label>
                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-[#F7F5F0] border border-[#EBE8E0] px-3 py-3 rounded-xl text-base font-bold text-[#3D3B38] text-center focus:outline-none focus:border-[#635BFF]" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-[#8D8B86] uppercase block mb-1">Height (cm)</label>
                    <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-[#F7F5F0] border border-[#EBE8E0] px-3 py-3 rounded-xl text-base font-bold text-[#3D3B38] text-center focus:outline-none focus:border-[#635BFF]" />
                  </div>
                </div>

                <button onClick={() => setStep(1)} className="w-full py-4 bg-[#635BFF] text-white rounded-2xl font-bold text-base shadow-[0_8px_20px_rgba(99,102,241,0.3)] active:scale-95 transition-all flex justify-center items-center gap-2">
                  Next <ChevronRight size={16} />
                </button>
              </motion.div>
            )}

            {/* STEP 1: Activity Level */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
                <div className="text-center mb-2">
                  <h4 className="text-lg font-black text-[#3D3B38]">Activity Level</h4>
                  <p className="text-sm font-bold text-[#8D8B86]">How active are you on a typical week?</p>
                </div>

                <div className="space-y-2">
                  {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map(level => (
                    <button key={level} onClick={() => setActivityLevel(level)} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${activityLevel === level ? 'bg-[#635BFF]/5 border-[#635BFF] shadow-sm' : 'bg-[#F7F5F0] border-[#EBE8E0]'}`}>
                      <Activity size={16} className={activityLevel === level ? 'text-[#635BFF]' : 'text-[#8D8B86]'} />
                      <span className={`text-xs font-bold ${activityLevel === level ? 'text-[#3D3B38]' : 'text-[#8D8B86]'}`}>{ACTIVITY_LABELS[level]}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(0)} className="flex-1 py-4 bg-[#F7F5F0] text-[#3D3B38] rounded-2xl font-bold text-base border border-[#EBE8E0] active:scale-95 transition-all">
                    Back
                  </button>
                  <button onClick={() => setStep(2)} className="flex-1 py-4 bg-[#635BFF] text-white rounded-2xl font-bold text-base shadow-[0_8px_20px_rgba(99,102,241,0.3)] active:scale-95 transition-all flex justify-center items-center gap-2">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Fitness Goal */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
                <div className="text-center mb-2">
                  <h4 className="text-lg font-black text-[#3D3B38]">Your Goal</h4>
                  <p className="text-sm font-bold text-[#8D8B86]">We'll calculate the perfect macro split</p>
                </div>

                <div className="space-y-3">
                  {(Object.keys(GOAL_LABELS) as FitnessGoal[]).map(goal => (
                    <button key={goal} onClick={() => setFitnessGoal(goal)} className={`w-full p-5 rounded-2xl border transition-all flex items-center gap-4 ${fitnessGoal === goal ? 'bg-[#635BFF]/5 border-[#635BFF] shadow-sm' : 'bg-[#F7F5F0] border-[#EBE8E0]'}`}>
                      <span className="text-2xl">{GOAL_LABELS[goal].emoji}</span>
                      <div className="text-left">
                        <span className={`text-sm font-black block ${fitnessGoal === goal ? 'text-[#3D3B38]' : 'text-[#8D8B86]'}`}>{GOAL_LABELS[goal].label}</span>
                        <span className="text-xs font-bold text-[#8D8B86]">{GOAL_LABELS[goal].desc}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 bg-[#F7F5F0] text-[#3D3B38] rounded-2xl font-bold text-base border border-[#EBE8E0] active:scale-95 transition-all">
                    Back
                  </button>
                  <button onClick={calculateAll} className="flex-1 py-4 bg-[#635BFF] text-white rounded-2xl font-bold text-base shadow-[0_8px_20px_rgba(99,102,241,0.3)] active:scale-95 transition-all flex justify-center items-center gap-2">
                    <Calculator size={16} /> Calculate
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Results */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="text-center mb-2">
                  <h4 className="text-lg font-black text-[#3D3B38]">Your Personalized Plan</h4>
                  <p className="text-sm font-bold text-[#8D8B86]">Based on Mifflin-St Jeor equation</p>
                </div>

                {/* BMR & TDEE Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#EBE8E0] text-center">
                    <span className="text-xs font-black text-[#8D8B86] uppercase tracking-widest block mb-1">BMR</span>
                    <span className="text-2xl font-black text-[#3D3B38]">{bmr}</span>
                    <span className="text-xs font-bold text-[#8D8B86] block mt-1">kcal/day at rest</span>
                  </div>
                  <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#EBE8E0] text-center">
                    <span className="text-xs font-black text-[#8D8B86] uppercase tracking-widest block mb-1">TDEE</span>
                    <span className="text-2xl font-black text-[#635BFF]">{tdee}</span>
                    <span className="text-xs font-bold text-[#8D8B86] block mt-1">kcal/day total</span>
                  </div>
                </div>

                {/* Target Calories */}
                <div className="bg-gradient-to-r from-[#635BFF]/10 to-[#83B593]/10 rounded-2xl p-5 border border-[#635BFF]/20 text-center">
                  <span className="text-xs font-black text-[#635BFF] uppercase tracking-widest block mb-2">
                    {fitnessGoal === 'cut' ? '🔥 CUT TARGET (-500 kcal)' : fitnessGoal === 'bulk' ? '💪 BULK TARGET (+300 kcal)' : '⚖️ MAINTENANCE TARGET'}
                  </span>
                  <span className="text-4xl font-black text-[#3D3B38] block">{targetCalories}</span>
                  <span className="text-sm font-bold text-[#8D8B86] block mt-1">calories per day</span>
                </div>

                {/* Macro Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EBE8E0] text-center shadow-sm">
                    <span className="text-[10px] font-black text-[#83B593] uppercase tracking-widest block mb-1">Protein</span>
                    <span className="text-xl font-black text-[#3D3B38]">{targetProtein}g</span>
                    <span className="text-[10px] font-bold text-[#8D8B86] block mt-0.5">{(parseFloat(weight) ? (targetProtein / parseFloat(weight)).toFixed(1) : '2.0')}g/kg</span>
                  </div>
                  <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EBE8E0] text-center shadow-sm">
                    <span className="text-[10px] font-black text-[#E67F63] uppercase tracking-widest block mb-1">Fat</span>
                    <span className="text-xl font-black text-[#3D3B38]">{targetFat}g</span>
                    <span className="text-[10px] font-bold text-[#8D8B86] block mt-0.5">{Math.round((targetFat * 9 / targetCalories) * 100)}% of cals</span>
                  </div>
                  <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EBE8E0] text-center shadow-sm">
                    <span className="text-[10px] font-black text-[#5C99D6] uppercase tracking-widest block mb-1">Fiber</span>
                    <span className="text-xl font-black text-[#3D3B38]">{targetFiber}g</span>
                    <span className="text-[10px] font-bold text-[#8D8B86] block mt-0.5">gut health</span>
                  </div>
                </div>

                {/* Science Explanation */}
                <div className="bg-[#F7F5F0] rounded-xl p-3 border border-[#EBE8E0]">
                  <p className="text-xs font-bold text-[#8D8B86] leading-relaxed">
                    <strong className="text-[#3D3B38]">The Math:</strong> BMR is calculated using the Mifflin-St Jeor equation, multiplied by your activity level to get TDEE. 
                    {fitnessGoal === 'cut' && ' A 500 kcal deficit targets ~0.5kg fat loss/week while preserving muscle with high protein (2.2g/kg).'}
                    {fitnessGoal === 'bulk' && ' A 300 kcal surplus supports lean muscle gain without excessive fat. Protein at 1.8g/kg for optimal muscle protein synthesis.'}
                    {fitnessGoal === 'maintain' && ' Protein at 2.0g/kg supports muscle maintenance and recovery. Fat at 30% supports hormonal health.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 py-4 bg-[#F7F5F0] text-[#3D3B38] rounded-2xl font-bold text-base border border-[#EBE8E0] active:scale-95 transition-all">
                    Edit
                  </button>
                  <button onClick={handleApplyGoals} className="flex-1 py-4 bg-[#83B593] text-white rounded-2xl font-bold text-base shadow-[0_8px_20px_rgba(131,181,147,0.3)] active:scale-95 transition-all flex justify-center items-center gap-2">
                    <Target size={16} /> Apply Goals
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
