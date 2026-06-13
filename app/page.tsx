"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion, useInView } from "framer-motion";
import {
  Camera,
  ChevronRight,
  Flame,
  Sparkles,
  Target
} from "lucide-react";

// Phone mockup sub-components
function PhoneProgressRing() {
  const circumference = 2 * Math.PI * 46;
  const targetOffset = circumference * (1 - 0.70);
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90 absolute">
        <circle
          cx="64"
          cy="64"
          r="46"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="8"
          fill="transparent"
        />
        <motion.circle
          cx="64"
          cy="64"
          r="46"
          stroke="url(#phone-ring-grad)"
          strokeWidth="8"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
        />
        <defs>
          <linearGradient id="phone-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center z-10">
        <div className="text-[20px] font-black text-[#F8FAFC] leading-none">1,404</div>
        <div className="text-[10px] text-[#94A3B8] mt-0.5">/ 2,000 kcal</div>
        <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#10B981]/15 text-[#10B981]">
          ✓ On Track
        </span>
      </div>
    </div>
  );
}

// 3D Tilt Card Component
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [shimmerPos, setShimmerPos] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rotateY = ((mouseX / width) - 0.5) * 10; // -5 to +5 degrees
    const rotateX = (0.5 - (mouseY / height)) * 10; // -5 to +5 degrees

    setRotate({ x: rotateX, y: rotateY });
    setShimmerPos((mouseX / width) * 100);
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`glass-card relative transition-all duration-300 ${className}`}
      style={{
        transform: isHovered 
          ? `translateY(-4px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` 
          : `translateY(0px) rotateX(0deg) rotateY(0deg)`,
        transformStyle: 'preserve-3d',
        borderColor: isHovered ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <div 
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) ${shimmerPos}%, transparent 100%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
}

// Scroll Reveal Components
interface RevealProps {
  children: React.ReactNode;
  className?: string;
}

function RevealContainer({ children, className = "" }: RevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.12 });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function RevealItem({ children, className = "" }: RevealProps) {
  const itemVariants = {
    hidden: { opacity: 0, y: 32 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const shouldReduceMotion = useReducedMotion() && mounted;

  // Variants for animations
  const fadeDown = (delay: number) => ({
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: shouldReduceMotion ? 0.01 : 0.6, 
        ease: [0.22, 1, 0.36, 1], 
        delay 
      }
    }
  });

  const fadeUp = (delay: number) => ({
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: shouldReduceMotion ? 0.01 : 0.6, 
        ease: [0.22, 1, 0.36, 1], 
        delay 
      }
    }
  });

  return (
    <div className="landing-theme overflow-x-hidden relative min-h-screen">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="orb orb-1 top-[-10%] left-[-10%] w-[350px] h-[350px] md:w-[600px] md:h-[600px]" />
        <div className="orb orb-2 top-[-10%] right-[-10%] w-[350px] h-[350px] md:w-[600px] md:h-[600px]" />
        <div className="orb orb-3 bottom-[-10%] left-[-10%] w-[350px] h-[350px] md:w-[600px] md:h-[600px]" />
        <div className="orb orb-4 bottom-[-10%] right-[-10%] w-[350px] h-[350px] md:w-[600px] md:h-[600px]" />
      </div>

      {/* Nav */}
      <nav 
        role="navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/5 backdrop-blur-[20px] ${
          scrolled ? "bg-[#080C18]/95 py-4" : "bg-[#080C18]/70 py-6"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight text-white flex items-center gap-1 select-none">
            diet<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#06B6D4]">Buddy</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors">
              Login
            </Link>
            <Link 
              href="/auth/register" 
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-90 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        aria-label="dietBuddy Hero"
        className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 hero-grid min-h-screen flex flex-col justify-center items-center text-center z-10"
      >
        <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            {/* Pill Badge */}
            <motion.div
              variants={fadeDown(0)}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#141C35]/60 border border-white/10 backdrop-blur-md"
            >
              <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs font-extrabold text-[#94A3B8] tracking-widest uppercase">
                MEET YOUR NEW PERSONAL NUTRITIONIST
              </span>
            </motion.div>

            {/* Title H1 */}
            <motion.h1
              variants={fadeDown(0.1)}
              initial="hidden"
              animate="visible"
              className="text-4xl md:text-5xl lg:text-6xl font-black text-[#F8FAFC] tracking-tight leading-[1.15]"
              style={{ fontSize: "clamp(36px, 10vw, 56px)" }}
            >
              Snap your food. <br />
              Know your macros. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#06B6D4]">
                Grow your health. Instantly.
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={fadeDown(0.25)}
              initial="hidden"
              animate="visible"
              className="text-base md:text-lg text-[#94A3B8] max-w-xl leading-relaxed"
            >
              Stop guessing calories. Just take a picture of your plate, and our AI instantly breaks down the protein, carbs, and fats to help you hit your daily goals effortlessly.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              variants={fadeUp(0.35)}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <Link 
                href="/auth/register" 
                className="w-full sm:w-auto text-center font-extrabold text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 py-4 px-8 rounded-2xl shadow-[0_8px_30px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 max-w-[380px] sm:max-w-none h-12 md:h-14"
              >
                📸  Start Scanning Free
              </Link>
              <a 
                href="#how" 
                className="w-full sm:w-auto text-center font-bold text-[#F8FAFC] bg-[#141C35]/60 border border-white/10 hover:bg-[#141C35]/90 py-4 px-8 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 max-w-[380px] sm:max-w-none h-12 md:h-14"
              >
                See How It Works  ›
              </a>
            </motion.div>
          </div>

          {/* Right Mockup Column */}
          <div className="lg:col-span-5 flex justify-center items-center w-full">
            <motion.div
              variants={shouldReduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : {
                hidden: { opacity: 0, y: 40, scale: 0.92 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.5 } }
              }}
              initial="hidden"
              animate="visible"
              className="w-full max-w-[260px] mx-auto"
            >
              <div className="relative mx-auto w-[260px] h-[520px] phone-shell select-none">
                {/* Under-glow */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-12 bg-[#6366F1]/25 blur-xl rounded-full pointer-events-none" />

                {/* Outer Rim and Glass Shell */}
                <div 
                  className="w-full h-full rounded-[36px] bg-slate-950/80 border border-white/10 p-[10px] relative overflow-hidden backdrop-blur-md"
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 25px 50px -12px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* Real Notch at Top Center */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[110px] h-[18px] bg-slate-950 rounded-b-xl z-30 flex items-center justify-center">
                    <div className="w-12 h-1 bg-neutral-800 rounded-full mb-1" />
                  </div>

                  {/* Screen Container */}
                  <div className="w-full h-full rounded-[28px] bg-[#0A0F1E] border border-white/5 overflow-hidden flex flex-col justify-between pt-6 pb-4 px-4 text-left relative">
                    <div className="absolute -top-10 -left-10 w-28 h-28 bg-[#6366F1]/10 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-[#06B6D4]/10 rounded-full blur-xl pointer-events-none" />

                    {/* Screen Header */}
                    <div className="flex items-center justify-between z-10">
                      <span className="text-xs font-black tracking-tight text-white flex items-center gap-0.5">
                        diet<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#06B6D4]">Buddy</span>
                      </span>
                      <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        🔥 7
                      </span>
                    </div>

                    {/* Progress Circle Row */}
                    <div className="flex justify-center my-3 z-10">
                      <PhoneProgressRing />
                    </div>

                    {/* Macro Progress Bars */}
                    <div className="space-y-2.5 z-10">
                      {/* Protein */}
                      <div className="flex justify-between text-[10px]">
                        <span className="font-bold text-[#94A3B8]">Protein</span>
                        <span className="font-bold text-[#10B981]">95g / 130g</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-[#10B981]" 
                          initial={{ width: 0 }}
                          animate={{ width: `${(95/130)*100}%` }}
                          transition={{ duration: 1.2, delay: 0.3 }}
                        />
                      </div>
                    </div>

                      {/* Carbs */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-bold text-[#94A3B8]">Carbs</span>
                          <span className="font-bold text-[#6366F1]">140g / 220g</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-[#6366F1]" 
                            initial={{ width: 0 }}
                            animate={{ width: `${(140/220)*100}%` }}
                            transition={{ duration: 1.2, delay: 0.4 }}
                          />
                        </div>
                      </div>

                      {/* Fats */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-bold text-[#94A3B8]">Fats</span>
                          <span className="font-bold text-[#F59E0B]">45g / 65g</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-[#F59E0B]" 
                            initial={{ width: 0 }}
                            animate={{ width: `${(45/65)*100}%` }}
                            transition={{ duration: 1.2, delay: 0.5 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Meal Row */}
                    <div className="bg-[#141C35]/60 border border-white/5 p-2 rounded-xl flex items-center justify-between text-[9px] mt-2.5 z-10">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-[#F8FAFC]">Grilled Chicken</span>
                        <span className="text-[#94A3B8]">180g · AI scanned</span>
                      </div>
                      <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#06B6D4]">297 kcal</span>
                    </div>

                    {/* Bottom mini scan CTA */}
                    <Link 
                      href="/auth/register" 
                      className="mt-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-[10px] font-black py-2 rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all z-10"
                    >
                      📸 Tap to scan your next meal
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* SECTION 2 — HOW IT WORKS */}
      <section 
        id="how"
        aria-label="How it works"
        className="relative py-24 md:py-32 px-6 bg-[#0F1629] z-10 border-y border-white/5"
      >
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <RevealContainer className="text-center mb-16 md:mb-20 flex flex-col items-center">
            <RevealItem>
              <span className="text-xs md:text-sm font-extrabold text-[#6366F1] tracking-widest uppercase mb-3 block">
                FRICTIONLESS TRACKING
              </span>
            </RevealItem>
            <RevealItem>
              <h2 
                className="text-3xl md:text-4xl font-black text-[#F8FAFC] tracking-tight mb-4"
                style={{ fontSize: "clamp(24px, 6vw, 38px)" }}
              >
                Tracking Made Frictionless
              </h2>
            </RevealItem>
            <RevealItem>
              <p className="text-sm md:text-base text-[#94A3B8] max-w-xl leading-relaxed">
                We removed the painful search-and-log process. Now, your camera is your ultimate food diary.
              </p>
            </RevealItem>
          </RevealContainer>

          {/* Cards Grid */}
          <RevealContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <RevealItem className="flex justify-center">
              <TiltCard className="p-8 flex flex-col items-start text-left h-full max-w-[380px] md:max-w-none">
                <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mb-6">
                  <Camera className="w-6 h-6 text-[#6366F1]" />
                </div>
                <h3 className="text-xl font-bold text-[#F8FAFC] mb-3">1. Snap a Photo</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">
                  Just point your camera at your meal. No more searching databases for &apos;chicken breast 100g&apos;.
                </p>
              </TiltCard>
            </RevealItem>

            {/* Step 2 */}
            <RevealItem className="flex justify-center">
              <TiltCard className="p-8 flex flex-col items-start text-left h-full max-w-[380px] md:max-w-none">
                <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-[#8B5CF6]" />
                </div>
                <h3 className="text-xl font-bold text-[#F8FAFC] mb-3">2. AI Analyzes</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">
                  Our vision model instantly recognises the food items and estimates precise macros.
                </p>
              </TiltCard>
            </RevealItem>

            {/* Step 3 */}
            <RevealItem className="flex justify-center">
              <TiltCard className="p-8 flex flex-col items-start text-left h-full max-w-[380px] md:max-w-none">
                <div className="w-12 h-12 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 text-[#06B6D4]" />
                </div>
                <h3 className="text-xl font-bold text-[#F8FAFC] mb-3">3. Hit Your Goals</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">
                  The calories and protein are automatically added to your daily progress rings.
                </p>
              </TiltCard>
            </RevealItem>
          </RevealContainer>
        </div>
      </section>
    </div>
  );
}
