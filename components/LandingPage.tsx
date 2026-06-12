"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Target, Zap, ShieldCheck, ChevronRight, Activity, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-slate-200 selection:bg-indigo-500/30 font-sans overflow-hidden">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-green/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Activity className="w-6 h-6 text-txt" />
          </div>
          <span className="text-xl font-black tracking-tight text-txt">diet<span className="text-indigo-400">Buddy</span></span>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <Link href="/auth/login" className="text-sm font-semibold text-txt-2 hover:text-txt transition-colors">
            Login
          </Link>
          <Link href="/auth/login" className="px-5 py-2.5 text-sm font-bold text-txt bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20">
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-s/50 backdrop-blur-sm mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-green animate-pulse"></span>
          <span className="text-xs font-bold text-txt-2 uppercase tracking-wider">Meet Your New Personal Nutritionist</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black text-txt tracking-tight leading-[1.1] mb-8"
        >
          Snap your food. <br/>
          Know your macros. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
            Grow your health. Instantly.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-txt-2 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Stop guessing calories. Just take a picture of your plate, and our AI instantly breaks down the protein, carbs, and fats to help you hit your daily goals effortlessly.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
        >
          <Link href="/auth/login" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-indigo-50 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
            <Camera className="w-5 h-5" />
            Start Scanning Free
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 bg-card border border-s text-txt font-bold rounded-2xl hover:bg-col transition-all flex items-center justify-center gap-2">
            See How It Works <ChevronRight className="w-4 h-4 text-txt-2" />
          </a>
        </motion.div>

        {/* Floating App Mockup (Visual Polish) */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-24 relative w-full max-w-4xl mx-auto aspect-video rounded-[40px] overflow-hidden border border-s/50 shadow-2xl shadow-indigo-500/10 bg-card/50 backdrop-blur-sm p-4"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
          <div className="w-full h-full rounded-[32px] overflow-hidden border border bg-bg flex flex-col items-center justify-center relative">
             <div className="absolute top-8 left-8 right-8 flex justify-between items-start opacity-30">
               <div className="w-32 h-32 rounded-full bg-indigo-500/20 blur-3xl" />
               <div className="w-32 h-32 rounded-full bg-green/20 blur-3xl" />
             </div>
             <Sparkles className="w-16 h-16 text-indigo-500/50 mb-4 animate-pulse" />
             <h3 className="text-2xl font-black text-slate-700">AI Vision Engine Running...</h3>
          </div>
        </motion.div>
      </main>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 py-32 px-6 bg-bg/50 border-y border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-txt mb-6">Tracking Made Frictionless</h2>
            <p className="text-txt-2 max-w-2xl mx-auto text-lg">We removed the painful search-and-log process. Now, your camera is your ultimate food diary.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Camera, title: "1. Snap a Photo", desc: "Just point your camera at your meal. No more searching databases for 'chicken breast 100g'." },
              { icon: Sparkles, title: "2. AI Analyzes", desc: "Our vision model instantly recognizes the food items and estimates precise macros." },
              { icon: Target, title: "3. Hit Your Goals", desc: "The calories and protein are automatically added to your daily progress rings." }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="bg-card/50 border border p-8 rounded-[32px] hover:border-indigo-500/30 hover:bg-col/50 transition-all group"
              >
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <step.icon className="w-7 h-7 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-txt mb-3">{step.title}</h3>
                <p className="text-txt-2 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-3xl md:text-5xl font-black text-txt leading-tight">Your data, <br/><span className="text-indigo-400">synced everywhere.</span></h2>
            <p className="text-lg text-txt-2">Log a meal on your phone, see it instantly on your desktop. Our cloud infrastructure ensures you never lose a single gram of protein.</p>
            
            <ul className="space-y-4">
              {[
                { icon: ShieldCheck, text: "Secure NextAuth Authentication" },
                { icon: Zap, text: "Lightning fast Drizzle ORM Database" },
                { icon: TrendingUp, text: "Visual Progress Rings & Streaks" }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-txt-2 font-medium">
                  <div className="p-1.5 rounded-full bg-green/10 text-green">
                    <item.icon className="w-4 h-4" />
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 blur-3xl rounded-full" />
            <div className="relative bg-card border border-s p-8 rounded-[40px] shadow-2xl">
               <div className="space-y-6">
                 {/* Fake UI elements for visual appeal */}
                 <div className="h-4 w-1/3 bg-col rounded-full" />
                 <div className="flex gap-4">
                   <div className="h-24 w-24 rounded-full border-8 border-indigo-500/30 flex items-center justify-center border-t-indigo-500">
                     <span className="text-xl font-black text-txt">85%</span>
                   </div>
                   <div className="flex-1 space-y-3 pt-2">
                     <div className="h-3 w-full bg-col rounded-full overflow-hidden">
                       <div className="h-full w-[85%] bg-green rounded-full" />
                     </div>
                     <div className="h-3 w-3/4 bg-col rounded-full overflow-hidden">
                       <div className="h-full w-[60%] bg-orange rounded-full" />
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 py-32 px-6 bg-bg/80 border-t border/50">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black text-txt mb-6">Simple, Honest Pricing.</h2>
            <p className="text-txt-2 text-lg mb-12">No confusing subscriptions. No hidden fees. Just one payment for lifetime access to the AI engine.</p>
            
            <div className="relative p-[1px] rounded-[40px] bg-gradient-to-b from-indigo-500 via-slate-700 to-slate-800 overflow-hidden group">
              <div className="absolute inset-0 bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors" />
              <div className="relative bg-bg p-12 rounded-[40px] flex flex-col items-center">
                <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-bold tracking-wide uppercase mb-6">Lifetime Premium</span>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-6xl font-black text-txt">₹199</span>
                  <span className="text-txt-h font-medium">/ forever</span>
                </div>
                
                <ul className="space-y-4 mb-10 text-left w-full max-w-xs mx-auto">
                  {['Unlimited AI Scans', 'Cloud Sync across devices', 'Detailed Macro Breakdowns', 'Priority Support'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-txt-2">
                      <CheckIcon className="w-5 h-5 text-green flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/auth/login" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-txt font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2">
                  Get Lifetime Access <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border py-12 text-center text-txt-h text-sm relative z-10 bg-bg">
        <p>© {new Date().getFullYear()} dietBuddy. Built to grow your health. Instantly.</p>
      </footer>
    </div>
  );
}

function CheckIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
