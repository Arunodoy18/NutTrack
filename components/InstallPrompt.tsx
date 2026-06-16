"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // If app is already installed/standalone, don't show prompt
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    // Android / Desktop Chrome PWA Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone, wait a few seconds before showing manual instruction
    let iosTimer: NodeJS.Timeout;
    if (isIosDevice && !isStandalone) {
      iosTimer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -100, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: -100, opacity: 0 }} 
        className="fixed top-4 left-4 right-4 z-[100] bg-[#FFFFFF] border border-[#EBE8E0] shadow-xl rounded-2xl p-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#635BFF]/10 text-[#635BFF] rounded-xl flex items-center justify-center shrink-0">
            <Download size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#3D3B38] leading-tight">Install dietBuddy</h4>
            {isIOS ? (
              <p className="text-[10px] font-bold text-[#8D8B86] mt-0.5">
                Tap <Share size={10} className="inline mx-0.5" /> then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-[10px] font-bold text-[#8D8B86] mt-0.5">
                Install app for faster access
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {!isIOS && (
            <button 
              onClick={handleInstallClick} 
              className="bg-[#635BFF] text-[#FFFFFF] px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform"
            >
              Install
            </button>
          )}
          <button 
            onClick={dismiss} 
            className="w-8 h-8 flex items-center justify-center bg-[#F7F5F0] text-[#8D8B86] rounded-full active:scale-95"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
