import React from 'react';

interface HumanHeroProps {
  fillPct: number;
}

export default function HumanHero({ fillPct }: HumanHeroProps) {
  // Cap visual fill at 100% so it doesn't overflow the silhouette, 
  // but keep the actual logic for color coding.
  const visualFill = Math.min(Math.max(fillPct, 0), 100);

  let fillColor = "#fb923c"; // Orange
  if (fillPct >= 85 && fillPct <= 100) {
    fillColor = "#10b981"; // Green
  } else if (fillPct > 100) {
    fillColor = "#ef4444"; // Red
  }

  // Calculate the clip-path inset from top. 
  // 100% fill = 0% inset from top. 
  // 0% fill = 100% inset from top.
  const topInset = 100 - visualFill;

  return (
    <div className="relative w-full max-w-[200px] aspect-[1/2] mx-auto flex items-center justify-center">
      {/* Grey Silhouette (Background) */}
      <svg
        viewBox="0 0 100 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full text-surface-line"
      >
        <path
          d="M50 40a20 20 0 1 0 0-40 20 20 0 0 0 0 40zm22.5 10H27.5C17.85 50 10 57.85 10 67.5v80C10 153.02 14.48 157.5 20 157.5s10-4.48 10-10v-60h2.5v152.5c0 5.52 4.48 10 10 10s10-4.48 10-10V160h5v80c0 5.52 4.48 10 10 10s10-4.48 10-10V87.5h2.5v60c0 5.52 4.48 10 10 10s10-4.48 10-10v-80C90 57.85 82.15 50 72.5 50z"
          fill="currentColor"
        />
      </svg>

      {/* Colored Silhouette (Foreground, masked) */}
      <svg
        viewBox="0 0 100 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full transition-all duration-1000 ease-out drop-shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
        style={{
          clipPath: `inset(${topInset}% 0 0 0)`,
          color: fillColor,
        }}
      >
        <path
          d="M50 40a20 20 0 1 0 0-40 20 20 0 0 0 0 40zm22.5 10H27.5C17.85 50 10 57.85 10 67.5v80C10 153.02 14.48 157.5 20 157.5s10-4.48 10-10v-60h2.5v152.5c0 5.52 4.48 10 10 10s10-4.48 10-10V160h5v80c0 5.52 4.48 10 10 10s10-4.48 10-10V87.5h2.5v60c0 5.52 4.48 10 10 10s10-4.48 10-10v-80C90 57.85 82.15 50 72.5 50z"
          fill="currentColor"
        />
      </svg>

      {/* Percentage Badge */}
      <div className="absolute top-8 -right-4 bg-white px-3 py-1.5 rounded-full shadow-md border border-surface-line flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
        <span className="text-sm font-black text-ink">{Math.round(fillPct)}%</span>
      </div>
    </div>
  );
}
