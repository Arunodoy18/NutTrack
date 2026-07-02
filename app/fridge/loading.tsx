import React from 'react';

export default function FridgeLoading() {
  return (
    <div className="min-h-screen bg-surface-muted text-ink font-sans pb-28 animate-pulse">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <div className="h-3 w-32 bg-surface-line rounded-full mb-2"></div>
        <div className="h-8 w-48 bg-[#E0DDD6] rounded-full mb-6"></div>
        
        <div className="h-4 w-full bg-surface-line rounded-full mb-8"></div>

        {/* Generate Button Skeleton */}
        <div className="w-full h-14 bg-[#E0DDD6] rounded-[24px] mb-8"></div>

        {/* Recipe Cards Skeleton */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-surface-line shadow-sm flex flex-col gap-3">
            <div className="w-full h-40 bg-surface-line rounded-2xl"></div>
            <div className="h-5 w-[80%] bg-[#E0DDD6] rounded-full mt-2"></div>
            <div className="h-4 w-full bg-surface-line rounded-full"></div>
            <div className="h-4 w-[60%] bg-surface-line rounded-full"></div>
          </div>
          
          <div className="bg-white p-4 rounded-3xl border border-surface-line shadow-sm flex flex-col gap-3">
            <div className="w-full h-40 bg-surface-line rounded-2xl"></div>
            <div className="h-5 w-[70%] bg-[#E0DDD6] rounded-full mt-2"></div>
            <div className="h-4 w-[90%] bg-surface-line rounded-full"></div>
            <div className="h-4 w-[50%] bg-surface-line rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
