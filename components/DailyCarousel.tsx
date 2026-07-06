"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DailyCarouselProps {
  todayTotals: any;
  dailyGoals: any;
}

export default function DailyCarousel({ todayTotals, dailyGoals }: DailyCarouselProps) {
  const [page, setPage] = useState<0 | 1>(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Math percentages for Pie Chart
  const pieData = [
    { name: 'Protein', value: todayTotals.protein || 0, color: '#10b981' },
    { name: 'Carbs', value: todayTotals.carbs || 0, color: '#8b5cf6' },
    { name: 'Fat', value: todayTotals.fat || 0, color: '#f59e0b' },
  ];

  const totalMacros = (todayTotals.protein || 0) + (todayTotals.carbs || 0) + (todayTotals.fat || 0);
  const activePieData = totalMacros > 0 ? pieData : [{ name: 'Empty', value: 1, color: '#e5e7eb' }];
  
  const getPct = (val: number) => {
    if (totalMacros === 0) return 0;
    return Math.round((val / totalMacros) * 100);
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = offset.x;
    if (swipe < -50 && page === 0) {
      setPage(1);
    } else if (swipe > 50 && page === 1) {
      setPage(0);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="w-full flex flex-col items-stretch">
      {/* Carousel Container */}
      <div className="w-full bg-white rounded-3xl p-6 shadow-sm min-h-[160px] relative overflow-hidden">
        <AnimatePresence initial={false} custom={page === 1 ? 1 : -1} mode="popLayout">
          {page === 0 ? (
            <motion.div
              key="macros"
              custom={-1}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-6"
            >
              {/* Pie Chart */}
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activePieData}
                      innerRadius={32}
                      outerRadius={50}
                      stroke="none"
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      {activePieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          className="transition-all duration-300 hover:opacity-80"
                          style={{
                            outline: 'none',
                            transformOrigin: 'center',
                            transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                          }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-200">
                  {activeIndex !== null && totalMacros > 0 ? (
                    <>
                      <span className="text-[9px] font-bold text-ink-soft uppercase tracking-widest leading-none" style={{ color: activePieData[activeIndex].color }}>
                        {activePieData[activeIndex].name}
                      </span>
                      <span className="text-lg font-black text-ink leading-none mt-1">
                        {activePieData[activeIndex].value}g
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold text-ink-soft uppercase tracking-widest leading-none">Today</span>
                      <span className="text-lg font-black text-ink leading-none mt-1">{todayTotals.calories}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 flex flex-col justify-center gap-3">
                <h3 className="text-sm font-black text-ink">Macro split</h3>
                <div className="space-y-2">
                  <div 
                    className={`flex items-center justify-between text-xs cursor-pointer p-1 -mx-1 rounded-md transition-colors ${activeIndex === 0 ? 'bg-surface-muted' : 'hover:bg-surface-muted'}`}
                    onMouseEnter={() => setActiveIndex(0)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 transition-transform" style={{ transform: activeIndex === 0 ? 'scale(1.2)' : 'scale(1)' }}></div>
                      <span className="font-bold text-ink">Protein</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-ink-soft font-medium">{todayTotals.protein}g</span>
                      <span className="font-bold text-ink w-8 text-right">{getPct(todayTotals.protein)}%</span>
                    </div>
                  </div>
                  <div 
                    className={`flex items-center justify-between text-xs cursor-pointer p-1 -mx-1 rounded-md transition-colors ${activeIndex === 1 ? 'bg-surface-muted' : 'hover:bg-surface-muted'}`}
                    onMouseEnter={() => setActiveIndex(1)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm bg-violet-500 transition-transform" style={{ transform: activeIndex === 1 ? 'scale(1.2)' : 'scale(1)' }}></div>
                      <span className="font-bold text-ink">Carbs</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-ink-soft font-medium">{todayTotals.carbs || 0}g</span>
                      <span className="font-bold text-ink w-8 text-right">{getPct(todayTotals.carbs || 0)}%</span>
                    </div>
                  </div>
                  <div 
                    className={`flex items-center justify-between text-xs cursor-pointer p-1 -mx-1 rounded-md transition-colors ${activeIndex === 2 ? 'bg-surface-muted' : 'hover:bg-surface-muted'}`}
                    onMouseEnter={() => setActiveIndex(2)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm bg-amber-500 transition-transform" style={{ transform: activeIndex === 2 ? 'scale(1.2)' : 'scale(1)' }}></div>
                      <span className="font-bold text-ink">Fat</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-ink-soft font-medium">{todayTotals.fat}g</span>
                      <span className="font-bold text-ink w-8 text-right">{getPct(todayTotals.fat)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="micros"
              custom={1}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              className="flex flex-col gap-4"
            >
              <h3 className="text-sm font-black text-ink">Micronutrients</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {/* Sodium */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5">
                    <span>Sodium</span>
                    <span>{todayTotals.sodium || 0} / {dailyGoals.sodium || 2300} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand transition-all" 
                      style={{ width: `${Math.min(((todayTotals.sodium || 0) / (dailyGoals.sodium || 2300)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Potassium */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5">
                    <span>Potassium</span>
                    <span>{todayTotals.potassium || 0} / {dailyGoals.potassium || 4700} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#f43f5e] transition-all" 
                      style={{ width: `${Math.min(((todayTotals.potassium || 0) / (dailyGoals.potassium || 4700)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Iron */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5">
                    <span>Iron</span>
                    <span>{todayTotals.iron || 0} / {dailyGoals.iron || 18} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all" 
                      style={{ width: `${Math.min(((todayTotals.iron || 0) / (dailyGoals.iron || 18)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Vitamin C */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5">
                    <span>Vitamin C</span>
                    <span>{todayTotals.vitaminC || 0} / {dailyGoals.vitaminC || 90} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 transition-all" 
                      style={{ width: `${Math.min(((todayTotals.vitaminC || 0) / (dailyGoals.vitaminC || 90)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination / Swipe Hint */}
      <div className="flex items-center justify-center gap-2 mt-4 pb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${page === 0 ? 'bg-brand' : 'bg-surface-line'}`} />
        <div className={`w-1.5 h-1.5 rounded-full ${page === 1 ? 'bg-brand' : 'bg-surface-line'}`} />
        <span className="text-[9px] font-bold text-ink-faint tracking-widest uppercase ml-2">
          {page === 0 ? 'SWIPE FOR MICROS ->' : '<- SWIPE FOR MACROS'}
        </span>
      </div>
    </div>
  );
}
