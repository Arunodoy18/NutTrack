"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Camera, Sparkles, Target, RefreshCw, Monitor, Smartphone, Check } from "lucide-react";

// --- COMPONENTS --- //

function PhoneProgressRing() {
  const circumference = 2 * Math.PI * 46;
  const targetOffset = circumference * (1 - 0.70);
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90 absolute" aria-label="Daily progress ring">
        <circle cx="56" cy="56" r="46" stroke="#F7F5F0" strokeWidth="8" fill="transparent" />
        <motion.circle
          cx="56" cy="56" r="46" stroke="#635BFF" strokeWidth="8" fill="transparent" strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }} transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-[18px] font-black text-[#3D3B38] leading-none">1,404</div>
        <div className="text-[9px] text-[#8D8B86] mt-0.5">/ 2,000 kcal</div>
        <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[#83B593]/15 text-[#83B593]">
          ✓ On Track
        </span>
      </div>
    </div>
  );
}

function SyncProgressRing({ targetPercentage, color, label }: { targetPercentage: number; color: string; label: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.12 });
  const circumference = 2 * Math.PI * 34; 
  const targetOffset = circumference * (1 - targetPercentage / 100);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20">
        <svg className="w-full h-full transform -rotate-90" aria-label={`${label} progress`}>
          <circle cx="50%" cy="50%" r="34" stroke="#F7F5F0" strokeWidth="6" fill="transparent" />
          <motion.circle
            cx="50%" cy="50%" r="34" stroke={color} strokeWidth="6" fill="transparent" strokeLinecap="round"
            strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
            animate={isInView ? { strokeDashoffset: targetOffset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs sm:text-sm font-bold text-[#3D3B38]">{targetPercentage}%</span>
        </div>
      </div>
      <span className="text-[9px] sm:text-[10px] text-[#8D8B86] font-black text-center whitespace-nowrap">{label}</span>
    </div>
  );
}

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const rotateY = (((e.clientX - rect.left) / rect.width) - 0.5) * 10;
    const rotateX = (0.5 - ((e.clientY - rect.top) / rect.height)) * 10;
    setRotate({ x: rotateX, y: rotateY });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setRotate({ x: 0, y: 0 }); setIsHovered(false); }}
      className={`bg-[#FFFFFF] border shadow-sm rounded-2xl relative transition-all duration-300 ${className}`}
      style={{
        transform: isHovered ? `translateY(-4px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` : `translateY(0px) rotateX(0deg) rotateY(0deg)`,
        transformStyle: 'preserve-3d',
        borderColor: isHovered ? 'rgba(99,102,241,0.4)' : '#EBE8E0',
      }}
    >
      {children}
    </div>
  );
}

// --- MAIN PAGE --- //

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => { setMounted(true); }, []);

  const slideUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="bg-[#F7F5F0] text-[#3D3B38] font-sans h-[100dvh] w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth hide-scrollbar relative">
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* FIXED NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[#EBE8E0] bg-[#F7F5F0]/90 backdrop-blur-md">
        <h1 className="text-[18px] font-bold text-[#3D3B38] flex items-center gap-1 tracking-tight select-none">
          diet<span className="text-[#635BFF]">Buddy</span>
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-[13px] font-medium text-[#8D8B86] hover:text-[#3D3B38] transition-colors">Login</Link>
          <Link href="/auth/register" className="bg-[#FFFFFF] border border-[#EBE8E0] shadow-sm hover:bg-[#F0ECE1] text-[#3D3B38] px-4 py-2 rounded-lg text-[13px] font-bold transition-all active:scale-95">
            Get Started
          </Link>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <section className="h-[100dvh] w-full snap-start flex flex-col justify-center items-center px-6 relative pt-12 overflow-hidden">
        <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full max-h-[800px]">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#EBE8E0] shadow-sm mb-6 text-[10px] font-bold tracking-widest uppercase text-[#8D8B86]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#83B593] animate-pulse" /> Meet your nutritionist
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#3D3B38] tracking-tight leading-[1.1] mb-4">
              Snap your food. <br /> Know your macros. <br />
              <span className="text-[#635BFF]">Grow your health.</span>
            </h1>
            <p className="text-sm sm:text-base text-[#8D8B86] max-w-md mb-8 leading-relaxed">
              Stop guessing calories. Just take a picture of your plate, and our AI instantly breaks down the protein, carbs, and fats.
            </p>
            <div className="flex gap-4 w-full sm:w-auto">
              <Link href="/auth/register" className="w-full sm:w-auto text-center font-bold text-[#FFFFFF] bg-[#3D3B38] hover:bg-[#2A2927] py-4 px-8 rounded-xl active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
                <Camera size={18} /> Start Scanning Free
              </Link>
            </div>
          </motion.div>

          {/* 3D Phone Mockup (Responsive & Light Theme) */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="flex justify-center w-full lg:scale-110">
            <div className="w-[240px] h-[480px] bg-[#EBE8E0] rounded-[36px] p-[8px] shadow-2xl relative border border-[#FFFFFF]">
              <div className="w-full h-full rounded-[28px] bg-[#FFFFFF] overflow-hidden flex flex-col justify-between pt-5 pb-3 px-3 relative border border-[#EBE8E0]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-[16px] bg-[#EBE8E0] rounded-b-xl z-20" />
                
                <div className="flex items-center justify-between z-10 px-1 mt-3">
                  <span className="text-[11px] font-black text-[#3D3B38]">dietBuddy</span>
                  <span className="text-[9px] font-bold text-[#E67F63] bg-[#E67F63]/10 px-1.5 py-0.5 rounded-full">🔥 7</span>
                </div>

                <div className="flex justify-center my-2 z-10"><PhoneProgressRing /></div>

                <div className="space-y-2 z-10 px-1">
                  <div>
                    <div className="flex justify-between text-[9px] mb-1"><span className="font-bold text-[#8D8B86]">Protein</span><span className="font-bold text-[#83B593]">95g / 130g</span></div>
                    <div className="h-1.5 w-full bg-[#F7F5F0] rounded-full overflow-hidden"><div className="h-full bg-[#83B593] w-[73%]" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] mb-1"><span className="font-bold text-[#8D8B86]">Carbs</span><span className="font-bold text-[#635BFF]">140g / 220g</span></div>
                    <div className="h-1.5 w-full bg-[#F7F5F0] rounded-full overflow-hidden"><div className="h-full bg-[#635BFF] w-[63%]" /></div>
                  </div>
                </div>

                <div className="bg-[#F7F5F0] border border-[#EBE8E0] p-2 rounded-xl flex items-center justify-between text-[8px] mt-3 z-10 mx-1">
                  <div className="flex flex-col"><span className="font-bold text-[#3D3B38]">Grilled Chicken</span><span className="text-[#8D8B86]">180g · AI scanned</span></div>
                  <span className="font-black text-[#635BFF]">297 kcal</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS (Horizontal Swipe on Mobile) */}
      <section className="h-[100dvh] w-full snap-start flex flex-col justify-center items-center py-16 bg-[#F7F5F0] relative overflow-hidden border-t border-[#EBE8E0]">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideUp} className="text-center mb-8 px-6">
          <span className="text-[10px] font-extrabold text-[#635BFF] tracking-widest uppercase mb-2 block">Frictionless Tracking</span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#3D3B38] tracking-tight mb-3">Your camera is your diary.</h2>
          <p className="text-sm text-[#8D8B86] max-w-sm mx-auto">We removed the painful search-and-log process. Just point and shoot.</p>
        </motion.div>

        {/* Swipeable Carousel */}
        <div className="w-full flex overflow-x-auto snap-x snap-mandatory gap-4 px-6 pb-6 hide-scrollbar md:grid md:grid-cols-3 md:gap-8 max-w-[1000px] mx-auto">
          {[
            { icon: Camera, title: "1. Snap a Photo", desc: "Just point your camera at your meal. No more searching databases.", color: "#3D3B38", bg: "#F7F5F0" },
            { icon: Sparkles, title: "2. AI Analyzes", desc: "Our vision model instantly recognizes the food items and estimates macros.", color: "#635BFF", bg: "#635BFF" },
            { icon: Target, title: "3. Hit Your Goals", desc: "The calories and protein are automatically added to your daily progress.", color: "#83B593", bg: "#83B593" }
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="shrink-0 w-[85vw] snap-center md:w-auto h-full">
              <TiltCard className="p-6 sm:p-8 flex flex-col items-start text-left h-full w-full">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-[#EBE8E0]`} style={{ backgroundColor: `${item.bg}15` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <h3 className="text-lg font-bold text-[#3D3B38] mb-2">{item.title}</h3>
                <p className="text-[13px] text-[#8D8B86] leading-relaxed">{item.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 3: AI ENGINE */}
      <section className="h-[100dvh] w-full snap-start flex flex-col justify-center items-center px-6 relative bg-[#FFFFFF] border-t border-[#EBE8E0]">
        <div className="max-w-[1000px] w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="flex justify-center w-full order-2 lg:order-1">
            <div className="bg-[#F7F5F0] border border-[#EBE8E0] shadow-sm rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center w-full max-w-[320px] aspect-square relative">
              <div className="text-[54px] text-[#635BFF] mb-4 font-serif leading-none font-bold">✦</div>
              <div className="text-center">
                <div className="text-[10px] font-extrabold text-[#5C99D6] tracking-widest uppercase mb-1">GPT-4O VISION</div>
                <div className="text-[#3D3B38] font-black text-lg">Neural Analyzer Active</div>
                <div className="text-[11px] text-[#8D8B86] mt-1.5 flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#635BFF]" /> Processing scan in 2.8s
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="flex flex-col items-center lg:items-start text-center lg:text-left order-1 lg:order-2">
            <span className="text-[10px] font-extrabold text-[#635BFF] tracking-widest uppercase mb-2">POWERED BY</span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#3D3B38] tracking-tight mb-4">GPT-4o Vision Engine</h2>
            <p className="text-sm text-[#8D8B86] leading-relaxed max-w-sm mb-6">
              The same model that powers world-class AI — now reading your plate. Real USDA-verified nutrition. Under 3 seconds.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 w-full max-w-[320px] lg:max-w-none">
              {["USDA Verified", "GPT-4o Vision", "91%+ Accuracy", "Under 3 sec", "Voice Logging", "Fridge Raider"].map((chip, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#EBE8E0] shadow-sm text-[10px] font-bold text-[#3D3B38]">{chip}</div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 4: SYNC & PRICING */}
      <section className="min-h-[100dvh] w-full snap-start flex flex-col justify-center items-center px-6 py-12 relative bg-[#F7F5F0] border-t border-[#EBE8E0]">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-[#3D3B38] tracking-tight mb-3">Your data, <span className="text-[#635BFF]">synced everywhere.</span></h2>
          <p className="text-sm text-[#8D8B86] max-w-sm mx-auto">No confusing subscriptions. No hidden fees. Just one payment for lifetime access.</p>
        </motion.div>

        <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Dashboard Preview */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="bg-[#FFFFFF] border border-[#EBE8E0] shadow-sm rounded-2xl p-6 relative overflow-hidden hidden md:block">
            <div className="flex justify-between items-center mb-4 border-b border-[#EBE8E0] pb-2">
              <span className="text-xs font-black text-[#3D3B38]">dietBuddy Cloud</span>
              <span className="text-[9px] text-[#635BFF] flex items-center gap-1"><Monitor className="w-3 h-3" /> Live Sync</span>
            </div>
            <div className="flex justify-between py-4">
              <SyncProgressRing targetPercentage={73} color="#83B593" label="Protein" />
              <SyncProgressRing targetPercentage={63} color="#635BFF" label="Carbs" />
              <SyncProgressRing targetPercentage={69} color="#E67F63" label="Fats" />
            </div>
          </motion.div>

          {/* Pricing Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="w-full mx-auto max-w-[400px]">
            <div className="bg-[#FFFFFF] border border-[#EBE8E0] shadow-lg rounded-3xl p-8 flex flex-col items-center relative text-center">
              <span className="px-3 py-1 rounded-full bg-[#635BFF]/10 text-[#635BFF] text-[10px] font-black tracking-widest uppercase mb-6">LIFETIME PREMIUM</span>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-[#3D3B38]">$0</span>
                <span className="text-xs font-bold text-[#8D8B86]">/ forever</span>
              </div>
              <ul className="space-y-3 mb-8 text-left w-full px-4">
                {["Unlimited AI Scans", "Cloud Sync across devices", "Detailed Macro Breakdowns", "AI Fridge Raider"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-bold text-[#8D8B86]"><Check className="w-4 h-4 text-[#83B593]" strokeWidth={3} />{feature}</li>
                ))}
              </ul>
              <Link href="/auth/register" className="w-full text-center font-bold text-[#FFFFFF] bg-[#3D3B38] hover:bg-[#2A2927] py-4 rounded-xl active:scale-95 transition-all shadow-md">
                Get Lifetime Access ›
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
    </div>
  );
}
