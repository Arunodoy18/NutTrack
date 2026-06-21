"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Camera, Check } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface font-sans text-ink">
      
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-6 max-w-lg mx-auto">
        <div className="text-xl font-black tracking-tight flex items-center">
          <span className="text-ink">diet</span>
          <span className="text-brand">Buddy</span>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-6 pt-6 pb-20 max-w-lg mx-auto space-y-8">
        
        {/* Coach Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20">
          <div className="w-2 h-2 rounded-full bg-brand"></div>
          <span className="text-[10px] font-black tracking-widest text-brand uppercase">
            AI Nutrition Coach
          </span>
        </div>

        {/* Hero Headline */}
        <div>
          <h1 className="text-5xl font-black tracking-tight leading-[1.05] text-ink">
            Snap your food.<br/>
            Know your macros.<br/>
            <span className="text-brand">Grow your health.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed font-medium text-ink-soft pr-4">
            Stop weighing. Stop searching. Stop guessing. Snap your plate and get calories, protein, fat & fiber in seconds.
          </p>
        </div>

        {/* Hero Image / Mockup */}
        <div className="w-full relative h-64 rounded-[32px] overflow-hidden shadow-2xl shadow-brand/10 border border-surface-line">
          <Image 
            src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop"
            alt="Healthy Food"
            fill
            className="object-cover"
            unoptimized
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
          
          {/* Floating UI Elements */}
          <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-brand"></div>
            <span className="text-[9px] font-black tracking-widest text-ink uppercase">AI Detected • 620 kcal</span>
          </div>

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl font-bold text-xs text-emerald-600 shadow-sm">P 42g</div>
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl font-bold text-xs text-amber-600 shadow-sm">F 22g</div>
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl font-bold text-xs text-blue-600 shadow-sm">Fib 8g</div>
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl font-bold text-xs text-indigo-600 shadow-sm">Na 480mg</div>
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl font-bold text-xs text-rose-600 shadow-sm">Fe 3mg</div>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="space-y-4 pt-4">
          <Link href="/auth/signup" className="w-full bg-brand hover:bg-[#e63e00] text-white rounded-[20px] py-4 flex items-center justify-center gap-2 font-bold text-base shadow-lg shadow-brand/30 transition-transform active:scale-[0.98]">
            <Camera className="w-5 h-5" />
            Start scanning free
          </Link>
          <div className="text-center">
            <Link href="/auth/login" className="text-sm font-bold text-ink-soft hover:text-ink transition-colors">
              I already have an account
            </Link>
          </div>
        </div>

        {/* Steps Section */}
        <div className="pt-12">
          <h2 className="text-3xl font-black tracking-tight text-ink mb-6">
            Tracking, frictionless.
          </h2>
          
          <div className="space-y-4">
            <div className="bg-white border border-surface-line rounded-[24px] p-5 flex gap-5 items-start shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-brand/10 text-brand rounded-[14px] flex items-center justify-center font-black text-lg shrink-0">1</div>
              <div>
                <h3 className="font-bold text-ink text-base mb-1">Snap a photo</h3>
                <p className="text-sm font-medium text-ink-soft leading-relaxed">Point your camera at any meal — no database searching.</p>
              </div>
            </div>
            
            <div className="bg-white border border-surface-line rounded-[24px] p-5 flex gap-5 items-start shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-brand/10 text-brand rounded-[14px] flex items-center justify-center font-black text-lg shrink-0">2</div>
              <div>
                <h3 className="font-bold text-ink text-base mb-1">AI analyzes</h3>
                <p className="text-sm font-medium text-ink-soft leading-relaxed">Vision model recognizes items and estimates precise macros.</p>
              </div>
            </div>

            <div className="bg-white border border-surface-line rounded-[24px] p-5 flex gap-5 items-start shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-brand/10 text-brand rounded-[14px] flex items-center justify-center font-black text-lg shrink-0">3</div>
              <div>
                <h3 className="font-bold text-ink text-base mb-1">Hit your goals</h3>
                <p className="text-sm font-medium text-ink-soft leading-relaxed">Calories and protein flow straight into your daily rings.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="pt-8">
          <div className="bg-[#fff1ec] border border-[#ffdfd4] rounded-[32px] p-8 shadow-sm">
            <div className="text-[10px] font-black tracking-widest text-brand uppercase mb-4">
              Lifetime Premium
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-black text-ink tracking-tight">₹199</span>
              <span className="text-sm font-bold text-ink-soft">/ forever</span>
            </div>
            <p className="text-sm font-medium text-ink-soft mb-8">
              One payment. No subscriptions, ever.
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Unlimited AI scans",
                "Cloud sync across devices",
                "Detailed macro breakdowns",
                "Priority support"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-bold text-ink">{feature}</span>
                </div>
              ))}
            </div>

            <button className="w-full bg-ink text-white py-4 rounded-[20px] font-bold shadow-lg shadow-ink/20 hover:bg-black transition-colors">
              Get lifetime access
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
