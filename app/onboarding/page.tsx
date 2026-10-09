import React from 'react';
import OnboardingCarousel from '@/components/OnboardingCarousel';

export default function OnboardingPage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-surface-muted flex flex-col">
      <OnboardingCarousel />
    </div>
  );
}
