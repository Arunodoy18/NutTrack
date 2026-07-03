"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, Camera, Refrigerator, User } from 'lucide-react';
import CameraModal from '@/components/CameraModal';

export default function BottomNav({ onCameraClick }: { onCameraClick?: () => void }) {
  const pathname = usePathname();

  // Determine active state safely
  const isHome = pathname === '/dashboard' || pathname === '/';
  const isInsights = pathname === '/insights';
  const isFridge = pathname === '/fridge';
  const isProfile = pathname === '/profile';

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const handleCameraClick = () => {
    if (onCameraClick) {
      onCameraClick();
    } else {
      setIsCameraModalOpen(true);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4 pointer-events-none">
      <div className="bg-white rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-surface-line px-6 py-4 flex items-center justify-between w-full max-w-md pointer-events-auto relative">
        
        {/* Home */}
        <Link href="/dashboard" prefetch={true} className="flex flex-col items-center gap-1 min-w-[50px] group">
          <Home className={`w-6 h-6 transition-colors ${isHome ? 'text-brand' : 'text-ink-soft group-hover:text-ink'}`} />
          <span className={`text-[10px] font-bold transition-colors ${isHome ? 'text-brand' : 'text-ink-soft group-hover:text-ink'}`}>Home</span>
        </Link>

        {/* Insights */}
        <Link href="/insights" prefetch={true} className="flex flex-col items-center gap-1 min-w-[50px] group">
          <BarChart2 className={`w-6 h-6 transition-colors ${isInsights ? 'text-brand' : 'text-ink-soft group-hover:text-ink'}`} />
          <span className={`text-[10px] font-bold transition-colors ${isInsights ? 'text-brand' : 'text-ink-soft group-hover:text-ink'}`}>Insights</span>
        </Link>

        {/* Floating Center Camera Button */}
        <div className="relative -top-8 mx-2">
          <button 
            onClick={handleCameraClick}
            className="w-16 h-16 bg-brand rounded-full flex items-center justify-center text-white shadow-[0_8px_24px_rgba(252,76,2,0.4)] hover:scale-105 active:scale-95 transition-transform"
          >
            <Camera className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>

        {/* Fridge */}
        <Link href="/fridge" prefetch={true} className="flex flex-col items-center gap-1 min-w-[50px] group">
          <Refrigerator className={`w-6 h-6 transition-colors ${isFridge ? 'text-brand' : 'text-ink-soft group-hover:text-ink'}`} />
          <span className={`text-[10px] font-bold transition-colors ${isFridge ? 'text-brand' : 'text-ink-soft group-hover:text-ink'}`}>Fridge</span>
        </Link>

        {/* Profile */}
        <Link href="/profile" prefetch={true} className="flex flex-col items-center gap-1 min-w-[50px] group">
          <User className={`w-6 h-6 transition-colors ${isProfile ? 'text-brand' : 'text-ink-soft group-hover:text-ink'}`} />
          <span className={`text-[10px] font-bold transition-colors ${isProfile ? 'text-brand' : 'text-ink-soft group-hover:text-ink'}`}>Profile</span>
        </Link>

      </div>

      <CameraModal 
        isOpen={isCameraModalOpen} 
        onClose={() => setIsCameraModalOpen(false)} 
        onMealSaved={() => window.location.reload()}
      />
    </div>
  );
}
