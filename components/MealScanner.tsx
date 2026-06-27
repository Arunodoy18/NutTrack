"use client";

import React from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import ComingSoon from '@/components/ComingSoon';

interface MealScannerProps {
  onClose: () => void;
}

export default function MealScanner({ onClose }: MealScannerProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-surface-muted w-full max-w-md rounded-t-[40px] pointer-events-auto relative flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 shrink-0">
          <div>
            <h2 className="text-xl font-black text-ink">Add a meal</h2>
            <p className="text-xs text-ink-soft mt-1">Choose how you want to log it.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-surface-line/50 rounded-full text-ink-soft hover:bg-surface-line transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 pb-8">
          
          {/* 2x2 Grid of Actions */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            
            <button onClick={onClose} className="bg-white border border-surface-line rounded-[24px] p-6 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-emerald-100 rounded-[16px] group-hover:scale-105 transition-transform"></div>
              <span className="font-bold text-ink text-sm">Snap</span>
            </button>
            
            <button onClick={onClose} className="bg-white border border-surface-line rounded-[24px] p-6 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-orange-100 rounded-[16px] group-hover:scale-105 transition-transform"></div>
              <span className="font-bold text-ink text-sm">Upload</span>
            </button>
            
            <ComingSoon>
              <button className="w-full bg-white border border-surface-line rounded-[24px] p-6 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-pink-100 rounded-[16px] group-hover:scale-105 transition-transform"></div>
                <span className="font-bold text-ink text-sm">Speak</span>
              </button>
            </ComingSoon>
            
            <ComingSoon>
              <button className="w-full bg-white border border-surface-line rounded-[24px] p-6 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-blue-100 rounded-[16px] group-hover:scale-105 transition-transform"></div>
                <span className="font-bold text-ink text-sm">Barcode</span>
              </button>
            </ComingSoon>

          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-surface-line"></div>
            <span className="text-[9px] font-bold tracking-widest text-ink-soft uppercase">Or pick a sample plate</span>
            <div className="flex-1 h-px bg-surface-line"></div>
          </div>

          {/* Sample Plates */}
          <div className="space-y-3">
            {[
              { name: "Zesty Salmon & Quinoa Bowl", p: 42, f: 22, fib: 8, img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop" },
              { name: "Garden Avocado Harvest Salad", p: 18, f: 31, fib: 12, img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop" },
              { name: "Seared Chicken Protein Plate", p: 35, f: 8, fib: 4, img: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=200&h=200&fit=crop" },
            ].map((plate, i) => (
              <ComingSoon key={i}>
                <button className="w-full bg-white border border-surface-line rounded-[24px] p-4 flex items-center gap-4 hover:shadow-md transition-shadow text-left">
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 shadow-sm border border-surface-line/50">
                    <Image 
                      src={plate.img} 
                      alt={plate.name}
                      width={64} height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-[15px] truncate mb-1">{plate.name}</h3>
                    <div className="flex items-center gap-3 text-[11px] font-bold text-ink-soft tracking-wide">
                      <span>P {plate.p}</span>
                      <span className="w-1 h-1 rounded-full bg-surface-line"></span>
                      <span>F {plate.f}</span>
                      <span className="w-1 h-1 rounded-full bg-surface-line"></span>
                      <span>Fib {plate.fib}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">
                    Kcal
                  </div>
                </button>
              </ComingSoon>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
