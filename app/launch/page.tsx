"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LaunchPage() {
  const router = useRouter();

  useEffect(() => {
    // Instantly replace the route in client side, taking advantage of Next.js loading.tsx
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-brand flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-24 h-24 bg-white text-brand rounded-[32px] flex items-center justify-center shadow-2xl mb-8 animate-pulse">
        <span className="text-6xl font-black lowercase tracking-tighter relative top-[-4px]">d</span>
      </div>
    </div>
  );
}
