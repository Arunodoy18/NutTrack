import React from 'react';

export default function InsightsLoading() {
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28 animate-pulse">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <div className="h-3 w-20 bg-surface-line rounded-full mb-2"></div>
        <div className="h-8 w-40 bg-[#E0DDD6] rounded-full mb-6"></div>

        {/* Segmented Control Skeleton */}
        <div className="flex bg-white rounded-full p-1 border border-surface-line shadow-sm mb-8 h-12">
          <div className="flex-1 bg-surface-line rounded-full m-0.5"></div>
          <div className="flex-1 bg-transparent rounded-full m-0.5"></div>
          <div className="flex-1 bg-transparent rounded-full m-0.5"></div>
          <div className="flex-1 bg-transparent rounded-full m-0.5"></div>
        </div>

        {/* Main Chart Card Skeleton */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-surface-line mb-4 relative h-64">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="h-10 w-24 bg-[#E0DDD6] rounded-full mb-2"></div>
              <div className="h-3 w-16 bg-surface-line rounded-full"></div>
            </div>
            <div className="h-4 w-20 bg-surface-line rounded-full"></div>
          </div>

          <div className="h-24 w-full flex items-end justify-between px-2">
            <div className="w-6 h-12 bg-surface-line rounded-t flex-shrink-0"></div>
            <div className="w-6 h-16 bg-[#E0DDD6] rounded-t flex-shrink-0"></div>
            <div className="w-6 h-10 bg-surface-line rounded-t flex-shrink-0"></div>
            <div className="w-6 h-20 bg-[#E0DDD6] rounded-t flex-shrink-0"></div>
            <div className="w-6 h-8 bg-surface-line rounded-t flex-shrink-0"></div>
            <div className="w-6 h-24 bg-[#E0DDD6] rounded-t flex-shrink-0"></div>
            <div className="w-6 h-14 bg-surface-line rounded-t flex-shrink-0"></div>
          </div>
        </div>

        {/* Info Cards Skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-surface-line h-28"></div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-surface-line h-28"></div>
        </div>
      </div>
    </div>
  );
}
