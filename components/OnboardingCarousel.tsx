"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Target, Flame, Camera, ChevronLeft, ScanLine, Dumbbell } from "lucide-react";

const SLIDES = [
  {
    eyebrow: "GAMIFICATION",
    title: "EARN EVERY BITE",
    subcopy: "Level up your nutrition with streaks and badges.",
  },
  {
    eyebrow: "AI CAPTURE",
    title: "SNAP ANY PLATE",
    subcopy: "Get macros from photos instantly using computer vision.",
  },
  {
    eyebrow: "PRECISION",
    title: "KNOW EVERY MACRO",
    subcopy: "See exactly how much protein, fat, and fiber you eat.",
  },
  {
    eyebrow: "PROGRESS",
    title: "CRUSH YOUR GOALS",
    subcopy: "Stay accountable and hit your targets effortlessly.",
  }
];

export default function OnboardingCarousel() {
  const [onbSlide, setOnbSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    setOnbSlide((prev) => (prev + 1) % 4);
  };

  const handleSkip = () => {
    router.push('/auth/signup');
  };

  const handleJoin = () => {
    router.push('/auth/signup');
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-6 pointer-events-none">
        <span className="font-display font-black text-xl text-ink pointer-events-auto">
          diet<span className="text-brand">Buddy</span>
        </span>
        <button 
          onClick={handleSkip}
          className="text-xs font-bold text-ink-soft uppercase tracking-widest pointer-events-auto hover:text-ink transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Carousel Area - Click anywhere to advance */}
      <div 
        className="flex-1 relative cursor-pointer pt-20"
        onClick={handleNext}
      >
        <div 
          className="flex h-full w-[400%] transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{ transform: `translateX(-${25 * onbSlide}%)` }}
        >
          {/* Slide 0: EARN EVERY BITE */}
          <div className="w-[25%] h-full flex flex-col px-8 pt-8">
            <div className="flex-1 w-full bg-surface-muted rounded-[32px] border-4 border-surface-line overflow-hidden relative flex items-center justify-center">
              {/* Glowing ring mockup */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent"></div>
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-[12px] border-surface-line flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-[12px] border-brand border-t-transparent border-l-transparent rotate-45"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-0 text-center">
                    <Flame className="w-8 h-8 text-brand mb-1" />
                    <span className="font-black text-2xl text-ink tracking-tighter">12</span>
                    <span className="text-[9px] font-bold text-ink-soft tracking-widest uppercase">Day Streak</span>
                  </div>
                </div>
                
                {/* Floating Chips */}
                <div className="absolute -top-6 -right-12 bg-white px-4 py-2 rounded-2xl shadow-xl border border-surface-line flex items-center gap-2 rotate-6">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-bold text-ink">+240 XP</span>
                </div>
                <div className="absolute -bottom-4 -left-8 bg-brand px-4 py-2 rounded-2xl shadow-xl shadow-brand/30 flex items-center gap-2 -rotate-3 text-white">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Badge Unlocked</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 mb-12 text-center pointer-events-none">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-brand uppercase">{SLIDES[0].eyebrow}</span>
              <h2 className="font-display font-black text-4xl mt-3 tracking-tight leading-none text-ink">{SLIDES[0].title}</h2>
              <p className="mt-4 text-sm font-medium text-ink-soft leading-relaxed max-w-[280px] mx-auto">{SLIDES[0].subcopy}</p>
            </div>
          </div>

          {/* Slide 1: SNAP ANY PLATE */}
          <div className="w-[25%] h-full flex flex-col px-8 pt-8">
            <div className="flex-1 w-full bg-ink rounded-[32px] border-4 border-ink-soft/20 overflow-hidden relative flex items-center justify-center">
              {/* Fake food photo background */}
              <div className="absolute inset-0 bg-[#2d2d31] opacity-50" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
              
              <div className="relative z-10 w-48 h-48 rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-surface-muted/10 backdrop-blur flex items-center justify-center">
                <Camera className="w-12 h-12 text-white/20" />
                
                {/* Animated scan line */}
                <motion.div 
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_0_15px_rgba(252,76,2,0.8)]"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                />

                {/* Floating Tag */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span className="text-xs font-black text-ink">620 KCAL</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 mb-12 text-center pointer-events-none">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-brand uppercase">{SLIDES[1].eyebrow}</span>
              <h2 className="font-display font-black text-4xl mt-3 tracking-tight leading-none text-ink">{SLIDES[1].title}</h2>
              <p className="mt-4 text-sm font-medium text-ink-soft leading-relaxed max-w-[280px] mx-auto">{SLIDES[1].subcopy}</p>
            </div>
          </div>

          {/* Slide 2: KNOW EVERY MACRO */}
          <div className="w-[25%] h-full flex flex-col px-8 pt-8">
            <div className="flex-1 w-full bg-surface-muted rounded-[32px] border-4 border-surface-line overflow-hidden relative flex items-center justify-center p-8">
               <div className="w-full bg-white rounded-[24px] p-6 shadow-xl shadow-ink/5 border border-surface-line flex flex-col gap-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-ink">Protein</span>
                      <span className="text-ink-soft">120g / 150g</span>
                    </div>
                    <div className="h-3 w-full bg-surface-line rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[80%] rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-ink">Fats</span>
                      <span className="text-ink-soft">45g / 65g</span>
                    </div>
                    <div className="h-3 w-full bg-surface-line rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 w-[70%] rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-ink">Fiber</span>
                      <span className="text-ink-soft">28g / 30g</span>
                    </div>
                    <div className="h-3 w-full bg-surface-line rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[93%] rounded-full" />
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="mt-8 mb-12 text-center pointer-events-none">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-brand uppercase">{SLIDES[2].eyebrow}</span>
              <h2 className="font-display font-black text-4xl mt-3 tracking-tight leading-none text-ink">{SLIDES[2].title}</h2>
              <p className="mt-4 text-sm font-medium text-ink-soft leading-relaxed max-w-[280px] mx-auto">{SLIDES[2].subcopy}</p>
            </div>
          </div>

          {/* Slide 3: CRUSH YOUR GOALS */}
          <div className="w-[25%] h-full flex flex-col px-8 pt-8">
            <div className="flex-1 w-full bg-brand-50 rounded-[32px] border-4 border-brand-100 overflow-hidden relative flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-[radial-gradient(#fc4c0222_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              <div className="relative">
                <div className="w-32 h-32 bg-white rounded-[32px] rotate-12 shadow-xl shadow-brand/20 border-4 border-white flex items-center justify-center overflow-hidden">
                   <div className="w-full h-full bg-brand/10 flex items-center justify-center">
                      <Dumbbell className="w-12 h-12 text-brand" />
                   </div>
                </div>
                
                <div className="absolute -top-6 -right-6 bg-ink text-white px-4 py-3 rounded-2xl shadow-xl rotate-[-5deg]">
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Goal Hit</div>
                  <div className="text-xl font-black">92%</div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 mb-12 text-center pointer-events-none">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-brand uppercase">{SLIDES[3].eyebrow}</span>
              <h2 className="font-display font-black text-4xl mt-3 tracking-tight leading-none text-ink">{SLIDES[3].title}</h2>
              <p className="mt-4 text-sm font-medium text-ink-soft leading-relaxed max-w-[280px] mx-auto">{SLIDES[3].subcopy}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Controls */}
      <div className="px-6 pb-12 bg-white">
        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2, 3].map((index) => (
            <button
              key={index}
              onClick={() => setOnbSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                onbSlide === index ? "w-6 bg-brand" : "w-2 bg-surface-line hover:bg-ink-soft"
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={handleJoin}
            className="w-full py-4 bg-brand hover:bg-brand-600 text-white font-black text-[15px] tracking-wide rounded-2xl shadow-xl shadow-brand/30 transition-all flex items-center justify-center"
          >
            Join for free
          </button>
          
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-surface-muted hover:bg-surface-line text-ink font-bold text-[15px] tracking-wide rounded-2xl transition-all flex items-center justify-center"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
