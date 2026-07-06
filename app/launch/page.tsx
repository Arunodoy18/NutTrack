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
      <div className="w-32 h-32 bg-white rounded-[32px] flex items-center justify-center shadow-2xl mb-8 animate-pulse overflow-hidden p-2">
        <img src="/icon.png" alt="DietBuddy" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
