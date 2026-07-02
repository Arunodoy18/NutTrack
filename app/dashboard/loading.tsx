import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-surface-muted text-ink pb-24 animate-pulse">
      {/* Header Skeleton */}
      <div className="pt-16 px-6 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-4 w-24 bg-surface-line rounded-full mb-2"></div>
            <div className="h-8 w-40 bg-[#E0DDD6] rounded-full"></div>
          </div>
          <div className="w-12 h-12 bg-surface-line rounded-full"></div>
        </div>

        {/* Circular Progress Rings Skeleton */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-surface-line mb-8 flex justify-center items-center h-64">
          <div className="w-48 h-48 rounded-full border-8 border-surface-line/50"></div>
        </div>

        {/* Goals Skeleton */}
        <div className="space-y-4 mb-8">
          <div className="h-6 w-32 bg-surface-line rounded-full mb-4"></div>
          
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-surface-line flex items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-line"></div>
              <div>
                <div className="h-5 w-24 bg-[#E0DDD6] rounded-full mb-2"></div>
                <div className="h-4 w-32 bg-surface-line rounded-full"></div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-line"></div>
          </div>
        </div>

        {/* AI Coach Skeleton */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E0DDD6]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-full bg-[#635BFF]/20"></div>
            <div className="h-4 w-20 bg-surface-line rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-surface-line rounded-full"></div>
            <div className="h-4 w-[90%] bg-surface-line rounded-full"></div>
            <div className="h-4 w-[60%] bg-surface-line rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
