import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-[20px] overflow-hidden shadow-lg bg-white p-2 animate-pulse">
          <img src="/icon.png" alt="DietBuddy" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
