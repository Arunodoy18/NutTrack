import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface HumanHeroProps {
  fillPct: number;
}

export default function HumanHero({ fillPct }: HumanHeroProps) {
  // Cap visual fill at 100% so it doesn't overflow the silhouette, 
  // but keep the actual logic for color coding.
  const visualFill = Math.min(Math.max(fillPct, 0), 100);

  // State to handle the mount animation (starts at 0 fill)
  const [animatedFill, setAnimatedFill] = useState(0);

  useEffect(() => {
    // Small delay for dramatic effect on load
    const timer = setTimeout(() => {
      setAnimatedFill(visualFill);
    }, 300);
    return () => clearTimeout(timer);
  }, [visualFill]);

  let fillColor = "#fb923c"; // Orange
  let glowColor = "rgba(251, 146, 60, 0.4)";
  let isPerfect = false;

  if (fillPct >= 85 && fillPct <= 100) {
    fillColor = "#10b981"; // Green
    glowColor = "rgba(16, 185, 129, 0.5)";
    isPerfect = true;
  } else if (fillPct > 100) {
    fillColor = "#ef4444"; // Red
    glowColor = "rgba(239, 68, 68, 0.5)";
  }

  // Calculate the clip-path inset from top. 
  const topInset = 100 - animatedFill;

  return (
    <motion.div 
      className="relative w-full max-w-[200px] aspect-[1/2] mx-auto flex items-center justify-center cursor-pointer"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Floating Sparkles for perfect score */}
      {isPerfect && (
        <motion.div 
          className="absolute -top-4 -left-4 text-emerald-500 z-10"
          animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-6 h-6" />
        </motion.div>
      )}

      {/* Floating Animation Wrapper for the Body */}
      <motion.div 
        className="relative w-full h-full"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Grey Silhouette (Background) */}
        <div
          className="absolute inset-0 w-full h-full bg-[#E5E7EB]"
          style={{
            WebkitMaskImage: `url('/images/human-flex.png')`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskImage: `url('/images/human-flex.png')`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center'
          }}
        />

        {/* Colored Silhouette (Foreground, masked) */}
        <div
          className="absolute inset-0 w-full h-full transition-all duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            backgroundColor: fillColor,
            filter: `drop-shadow(0 0 12px ${glowColor})`,
            clipPath: `inset(${topInset}% 0 0 0)`,
            WebkitMaskImage: `url('/images/human-flex.png')`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskImage: `url('/images/human-flex.png')`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center'
          }}
        />
      </motion.div>

      {/* Percentage Badge */}
      <motion.div 
        className="absolute top-8 -right-4 bg-white px-3 py-1.5 rounded-full shadow-lg border border-surface-line flex flex-col items-center justify-center z-20"
        initial={{ scale: 0, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 400, damping: 15 }}
      >
        <span className="text-sm font-black text-ink" style={{ color: fillColor }}>
          {Math.round(animatedFill)}%
        </span>
      </motion.div>
    </motion.div>
  );
}
