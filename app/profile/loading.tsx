import React from 'react';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-surface text-ink font-sans pb-28 animate-pulse">
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <div className="h-8 w-32 bg-[#E0DDD6] rounded-full mb-8"></div>
        
        {/* User Card Skeleton */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-surface-line mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-surface-line rounded-full shrink-0"></div>
            <div className="w-full">
              <div className="h-6 w-32 bg-[#E0DDD6] rounded-full mb-2"></div>
              <div className="h-4 w-48 bg-surface-line rounded-full"></div>
            </div>
          </div>
          <div className="h-10 w-full bg-surface-line rounded-xl"></div>
        </div>

        {/* Upgrade Card Skeleton */}
        <div className="bg-white rounded-[24px] p-6 border-2 border-surface-line shadow-sm mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-24 bg-[#E0DDD6] rounded-full"></div>
            <div className="h-4 w-32 bg-surface-line rounded-full"></div>
          </div>
          <div className="w-20 h-8 bg-surface-line rounded-full"></div>
        </div>

        {/* Settings List Skeleton */}
        <div className="space-y-3">
          <div className="bg-white rounded-[24px] p-4 flex items-center gap-4 border border-surface-line">
            <div className="w-10 h-10 bg-surface-line rounded-xl shrink-0"></div>
            <div className="h-5 w-32 bg-surface-line rounded-full"></div>
          </div>
          <div className="bg-white rounded-[24px] p-4 flex items-center gap-4 border border-surface-line">
            <div className="w-10 h-10 bg-surface-line rounded-xl shrink-0"></div>
            <div className="h-5 w-40 bg-surface-line rounded-full"></div>
          </div>
          <div className="bg-white rounded-[24px] p-4 flex items-center gap-4 border border-surface-line">
            <div className="w-10 h-10 bg-surface-line rounded-xl shrink-0"></div>
            <div className="h-5 w-24 bg-surface-line rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
