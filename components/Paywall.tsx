"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldCheck, Zap } from 'lucide-react';
import Script from 'next/script';

interface PaywallProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function Paywall({ onClose, onSuccess }: PaywallProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // 1. Create order
      const orderRes = await fetch('/api/razorpay/order', { method: 'POST' });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        alert("Could not initialize payment.");
        setIsProcessing(false);
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key here
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "dietBuddy",
        description: "Premium Subscription - 3 Months",
        image: "/icon.png",
        order_id: orderData.order.id,
        handler: async function (response: any) {
          // 3. Verify Payment
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            onSuccess();
          } else {
            alert("Payment verification failed.");
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: ""
        },
        theme: {
          color: "#635BFF"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error(response.error.description);
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D3B38]/60 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm bg-[#FFFFFF] rounded-[2rem] shadow-2xl overflow-hidden relative border border-[#EBE8E0]">
          
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#F7F5F0] text-[#8D8B86] hover:text-[#3D3B38] transition-colors z-10">
            <X size={16}/>
          </button>

          <div className="bg-[#F7F5F0] p-8 pb-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at center, #635BFF 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#635BFF]/10 text-[#635BFF] text-[10px] font-black tracking-widest uppercase mb-4 border border-[#635BFF]/20">
                <Zap size={12} fill="currentColor"/> Premium Access
              </span>
              <h3 className="text-2xl font-black text-[#3D3B38] tracking-tight leading-tight mb-2">Hit your daily scan limit!</h3>
              <p className="text-xs font-bold text-[#8D8B86]">Unlock the full power of dietBuddy AI to track everything you eat.</p>
            </div>
          </div>

          <div className="p-8 -mt-6 bg-[#FFFFFF] rounded-t-[2rem] relative z-10">
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-4xl font-black text-[#3D3B38]">₹299</span>
              <span className="text-sm font-bold text-[#8D8B86]">/ 3 months</span>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "Unlimited AI Meal Scans",
                "Advanced Macro Breakdowns",
                "AI Fridge Raider access",
                "Cloud Sync across devices"
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm font-bold text-[#3D3B38]">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-[#83B593]/10 flex items-center justify-center text-[#83B593]">
                    <Check size={14} strokeWidth={3}/>
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <button disabled={isProcessing} onClick={handlePayment} className="w-full py-4 bg-[#635BFF] hover:bg-[#524be0] text-[#FFFFFF] rounded-2xl font-bold text-sm shadow-[0_8px_20px_rgba(99,102,241,0.3)] disabled:opacity-50 active:scale-95 transition-all flex justify-center items-center gap-2">
              {isProcessing ? "Connecting to Razorpay..." : "Upgrade with GPay / UPI"}
            </button>
            <p className="text-center text-[10px] text-[#8D8B86] mt-4 font-bold flex items-center justify-center gap-1">
              <ShieldCheck size={12}/> Secure checkout by Razorpay
            </p>
          </div>

        </motion.div>
      </div>
    </>
  );
}
