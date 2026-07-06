"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { ChevronDown, TrendingUp, Calendar, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type MetricCategory = 'Macros' | 'Micros';
type MetricKey = 
  | 'calories' | 'protein' | 'fat' | 'carbs' | 'fiber'
  | 'sodium' | 'potassium' | 'iron' | 'vitaminC' | 'vitaminE' | 'vitaminB12' | 'calcium';

const TREND_METRICS: Record<MetricKey, { label: string; unit: string; color: string; category: MetricCategory }> = {
  calories: { label: 'Calories', unit: 'kcal', color: '#ff6b4a', category: 'Macros' },
  protein: { label: 'Protein', unit: 'g', color: '#8b5cf6', category: 'Macros' },
  carbs: { label: 'Carbs', unit: 'g', color: '#3b82f6', category: 'Macros' },
  fat: { label: 'Fat', unit: 'g', color: '#f59e0b', category: 'Macros' },
  fiber: { label: 'Fiber', unit: 'g', color: '#10b981', category: 'Macros' },
  sodium: { label: 'Sodium', unit: 'mg', color: '#ef4444', category: 'Micros' },
  potassium: { label: 'Potassium', unit: 'mg', color: '#f97316', category: 'Micros' },
  iron: { label: 'Iron', unit: 'mg', color: '#64748b', category: 'Micros' },
  vitaminC: { label: 'Vitamin C', unit: 'mg', color: '#eab308', category: 'Micros' },
  vitaminE: { label: 'Vitamin E', unit: 'mg', color: '#14b8a6', category: 'Micros' },
  vitaminB12: { label: 'Vitamin B12', unit: 'mcg', color: '#0ea5e9', category: 'Micros' },
  calcium: { label: 'Calcium', unit: 'mg', color: '#a855f7', category: 'Micros' },
};

interface TrendsChartProps {
  initialRange?: number; // 7 or 30
}

export default function TrendsChart({ initialRange = 30 }: TrendsChartProps) {
  const [range, setRange] = useState<number>(initialRange);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('calories');
  const [activeCategory, setActiveCategory] = useState<MetricCategory>('Macros');
  
  const [openDropdown, setOpenDropdown] = useState<'range' | 'macros' | 'micros' | null>(null);

  const [data, setData] = useState<any[]>([]);
  const [goals, setGoals] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trends?range=${range}`);
        const json = await res.json();
        if (isMounted) {
          if (json.success) {
            setData(json.data);
            setGoals(json.goals);
          } else {
            setError(json.error || "Failed to load trends");
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [range]);

  const metricDef = TREND_METRICS[activeMetric];
  const currentGoal = goals[activeMetric] || 0;

  // Derived stats
  const stats = useMemo(() => {
    if (!data.length) return { bestDay: null, onTargetDays: 0, avg: 0 };
    
    let bestDay = data[0];
    let onTargetDays = 0;
    let sum = 0;

    data.forEach(d => {
      const val = d[activeMetric] || 0;
      sum += val;
      
      // On Target logic (>= 90% of goal, or for things like sodium maybe <= 110%)
      // For simplicity, let's say hitting the goal is within 10% or exceeding for most.
      // Calories: +/- 10% is good. Protein: >= 90% is good.
      // We'll use >= 90% as "on target" for now to match prompt, unless it's sodium where lower is better? 
      // The prompt says "dayValue >= goal * 0.9". Let's stick to that.
      if (val >= currentGoal * 0.9) {
        onTargetDays++;
      }

      // Best day is closest to goal (abs diff)
      const currentDiff = Math.abs((bestDay[activeMetric] || 0) - currentGoal);
      const newDiff = Math.abs(val - currentGoal);
      if (newDiff < currentDiff) {
        bestDay = d;
      }
    });

    return {
      bestDay,
      onTargetDays,
      avg: Math.round(sum / data.length)
    };
  }, [data, activeMetric, currentGoal]);

  const handleDropdownClick = (dropdown: 'range' | 'macros' | 'micros') => {
    setOpenDropdown(prev => prev === dropdown ? null : dropdown);
  };

  const getBarColor = (index: number, value: number) => {
    const isToday = index === data.length - 1;
    if (isToday) return metricDef.color; // Highlight today in brand/metric color

    const isHit = value >= currentGoal * 0.9;
    return isHit ? `${metricDef.color}99` : '#e2e8f0'; // Tailwind slate-200 for miss, semi-transparent for hit
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-2xl shadow-xl border border-surface-line text-sm">
          <p className="font-bold text-ink mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metricDef.color }} />
            <span className="text-ink-soft">
              {payload[0].value} {metricDef.unit}
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-1">Goal: {currentGoal} {metricDef.unit}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-20">
        
        {/* Range Dropdown */}
        <div className="relative">
          <button 
            onClick={() => handleDropdownClick('range')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-line rounded-2xl text-sm font-bold text-ink shadow-sm hover:bg-surface-muted transition-colors"
          >
            <Calendar className="w-4 h-4 text-brand" />
            {range === 7 ? '7-Day Pulse' : '30-Day Journey'}
            <ChevronDown className={`w-4 h-4 text-ink-soft transition-transform ${openDropdown === 'range' ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {openDropdown === 'range' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 w-48 bg-white border border-surface-line rounded-2xl shadow-xl overflow-hidden"
              >
                <button 
                  onClick={() => { setRange(7); setOpenDropdown(null); }}
                  className="w-full text-left px-4 py-3 hover:bg-surface-muted transition-colors flex flex-col"
                >
                  <span className="font-bold text-ink text-sm">7-Day Pulse</span>
                  <span className="text-xs text-ink-soft">Short-term, at a glance</span>
                </button>
                <button 
                  onClick={() => { setRange(30); setOpenDropdown(null); }}
                  className="w-full text-left px-4 py-3 hover:bg-surface-muted transition-colors flex flex-col border-t border-surface-line"
                >
                  <span className="font-bold text-ink text-sm">30-Day Journey</span>
                  <span className="text-xs text-ink-soft">Long-term vs your goals</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Macros / Micros Tabs */}
        <div className="flex bg-surface-muted p-1 rounded-2xl border border-surface-line relative">
          
          {/* Macros Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setActiveCategory('Macros'); handleDropdownClick('macros'); }}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${activeCategory === 'Macros' ? 'bg-white shadow-sm text-ink' : 'text-ink-soft hover:text-ink'}`}
            >
              Macros <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'macros' ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openDropdown === 'macros' && activeCategory === 'Macros' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-40 bg-white border border-surface-line rounded-2xl shadow-xl p-2 flex flex-col gap-1"
                >
                  {Object.entries(TREND_METRICS).filter(([_, m]) => m.category === 'Macros').map(([key, m]) => (
                    <button
                      key={key}
                      onClick={() => { setActiveMetric(key as MetricKey); setOpenDropdown(null); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors ${activeMetric === key ? 'bg-surface-muted font-bold' : 'hover:bg-surface-muted'}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Micros Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setActiveCategory('Micros'); handleDropdownClick('micros'); }}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${activeCategory === 'Micros' ? 'bg-white shadow-sm text-ink' : 'text-ink-soft hover:text-ink'}`}
            >
              Micros <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'micros' ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openDropdown === 'micros' && activeCategory === 'Micros' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-40 bg-white border border-surface-line rounded-2xl shadow-xl p-2 flex flex-col gap-1"
                >
                  {Object.entries(TREND_METRICS).filter(([_, m]) => m.category === 'Micros').map(([key, m]) => (
                    <button
                      key={key}
                      onClick={() => { setActiveMetric(key as MetricKey); setOpenDropdown(null); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors ${activeMetric === key ? 'bg-surface-muted font-bold' : 'hover:bg-surface-muted'}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="w-full bg-white rounded-[32px] p-6 shadow-sm border border-surface-line">
        
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: metricDef.color }} />
              {metricDef.label} Trends
            </h3>
            <p className="text-xs text-ink-soft">Avg {stats.avg} {metricDef.unit} / day</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-ink-soft">
            <span className="w-4 h-[2px] bg-red-400 dashed rounded-full" style={{ borderTop: `2px dashed ${metricDef.color}` }}></span>
            Target {currentGoal}
          </div>
        </div>

        {/* The Recharts BarChart */}
        {isLoading ? (
          <div className="w-full h-48 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-surface-muted border-t-brand animate-spin" />
          </div>
        ) : error ? (
          <div className="w-full h-48 flex flex-col items-center justify-center text-red-500 gap-2">
            <AlertCircle className="w-6 h-6" />
            <p className="text-sm font-bold">Failed to load data</p>
          </div>
        ) : (
          <div className="w-full h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey={range === 7 ? "day" : "dateStr"} 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(val, i) => {
                    if (range === 30) {
                      // Only show a few labels for 30 days
                      return i % 6 === 0 ? `${range - i}d` : (i === range - 1 ? 'now' : '');
                    }
                    return val;
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <ReferenceLine y={currentGoal} stroke={metricDef.color} strokeDasharray="3 3" />
                <Bar 
                  dataKey={activeMetric} 
                  radius={[4, 4, 4, 4]} 
                  barSize={range === 7 ? 32 : 8}
                  animationDuration={500}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index, entry[activeMetric] || 0)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-surface-line shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-2">Best Day</p>
          <div>
            <h4 className="text-lg font-black text-ink">{stats.bestDay ? stats.bestDay.day : '-'}</h4>
            <p className="text-sm text-ink-soft">{stats.bestDay ? `${stats.bestDay[activeMetric] || 0} ${metricDef.unit}` : '-'}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-surface-line shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-2">On-Target Days</p>
          <div>
            <h4 className="text-lg font-black" style={{ color: metricDef.color }}>
              {stats.onTargetDays}/{range}
            </h4>
            <p className="text-sm text-ink-soft">consistency</p>
          </div>
        </div>
      </div>
    </div>
  );
}
