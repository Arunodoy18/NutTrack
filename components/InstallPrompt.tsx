"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, MoreVertical } from 'lucide-react';

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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      return;
    }

    // Android / Desktop Chrome PWA Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // We can show it immediately if the event fires
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Aggressively show prompt after 3 seconds for EVERYONE who isn't standalone
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If the prompt isn't available (e.g., they dismissed it recently, or browser blocks it)
      // We can't trigger the native prompt. The UI handles this state below.
      return;
    }

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
            ) : deferredPrompt ? (
              <p className="text-[10px] font-bold text-[#8D8B86] mt-0.5">
                Install app for faster access
              </p>
            ) : (
              <p className="text-[10px] font-bold text-[#8D8B86] mt-0.5">
                Tap <MoreVertical size={10} className="inline mx-0.5" /> then "Install app"
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {!isIOS && deferredPrompt && (
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
