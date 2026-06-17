"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldCheck, Zap, QrCode, CreditCard, ArrowRight } from 'lucide-react';
import Script from 'next/script';
import { verifyManualPaymentAction } from '@/app/actions';

interface PaywallProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function Paywall({ onClose, onSuccess }: PaywallProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'selection' | 'razorpay' | 'manual'>('selection');
  const [utr, setUtr] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const UPI_ID = "9864446805@fam";
  const AMOUNT = "299";
  // Generate a dynamic UPI QR Code using Google Charts API
  const qrUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=dietBuddy&am=${AMOUNT}&cu=INR`)}`;

  const handleRazorpay = async () => {
    setIsProcessing(true);
    try {
      const orderRes = await fetch('/api/razorpay/order', { method: 'POST' });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        alert("Could not initialize payment.");
        setIsProcessing(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "dietBuddy",
        description: "Premium Subscription - 3 Months",
        image: "/icon.png",
        order_id: orderData.order.id,
        handler: async function (response: any) {
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
        prefill: { name: "", email: "", contact: "" },
        theme: { color: "#635BFF" }
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

  const handleManualVerify = async () => {
    setErrorMsg("");
    if (utr.trim().length < 12) {
      setErrorMsg("Please enter the full 12-digit transaction ID.");
      return;
    }
    
    setIsProcessing(true);
    const res = await verifyManualPaymentAction(utr);
    setIsProcessing(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.error || "Verification failed. Try again.");
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
            {paymentMode === 'selection' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="flex items-baseline justify-center gap-1 mb-6">
                  <span className="text-4xl font-black text-[#3D3B38]">₹299</span>
                  <span className="text-sm font-bold text-[#8D8B86]">/ 3 months</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {["Unlimited AI Meal Scans", "Advanced Macro Breakdowns", "AI Fridge Raider access"].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-bold text-[#3D3B38]">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-[#83B593]/10 flex items-center justify-center text-[#83B593]">
                        <Check size={14} strokeWidth={3}/>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <button onClick={() => setPaymentMode('manual')} className="w-full py-4 bg-[#635BFF] hover:bg-[#524be0] text-[#FFFFFF] rounded-2xl font-bold text-sm shadow-[0_8px_20px_rgba(99,102,241,0.3)] active:scale-95 transition-all flex justify-between items-center px-6">
                    <span className="flex items-center gap-2"><QrCode size={18} /> Pay with QR Code (UPI)</span>
                    <ArrowRight size={18} />
                  </button>
                  <button onClick={() => { setPaymentMode('razorpay'); handleRazorpay(); }} className="w-full py-4 bg-[#F7F5F0] hover:bg-[#EBE8E0] text-[#3D3B38] rounded-2xl font-bold text-sm active:scale-95 transition-all flex justify-between items-center px-6">
                    <span className="flex items-center gap-2"><CreditCard size={18} /> Pay via Razorpay</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {paymentMode === 'manual' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-center">
                <button onClick={() => setPaymentMode('selection')} className="self-start text-[10px] font-bold text-[#8D8B86] hover:text-[#3D3B38] mb-4 flex items-center gap-1">
                  &larr; Back
                </button>
                <h4 className="text-sm font-black text-[#3D3B38] mb-1">Scan to Pay ₹299</h4>
                <p className="text-xs font-bold text-[#8D8B86] mb-4">UPI ID: {UPI_ID}</p>
                
                <div className="w-48 h-48 bg-[#F7F5F0] rounded-2xl p-2 border border-[#EBE8E0] mb-6 shadow-inner">
                  <img src={qrUrl} alt="UPI QR Code" className="w-full h-full object-contain rounded-xl" />
                </div>

                <div className="w-full space-y-2 mb-6">
                  <label className="text-xs font-bold text-[#3D3B38] ml-1">Enter Transaction ID (UTR)</label>
                  <input 
                    type="text" 
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 312345678901"
                    className="w-full bg-[#F7F5F0] border border-[#EBE8E0] rounded-xl px-4 py-3 text-sm font-bold text-[#3D3B38] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-[#8D8B86]/50"
                  />
                  {errorMsg && <p className="text-[10px] font-bold text-red-500 ml-1">{errorMsg}</p>}
                </div>

                <button disabled={isProcessing} onClick={handleManualVerify} className="w-full py-4 bg-[#83B593] hover:bg-[#6FA480] text-[#FFFFFF] rounded-2xl font-bold text-sm shadow-[0_8px_20px_rgba(131,181,147,0.3)] disabled:opacity-50 active:scale-95 transition-all flex justify-center items-center gap-2">
                  {isProcessing ? "Verifying..." : "Verify Payment"}
                </button>
              </motion.div>
            )}

            {paymentMode === 'razorpay' && (
              <div className="py-10 text-center flex flex-col items-center">
                 <div className="w-8 h-8 border-4 border-[#EBE8E0] border-t-[#635BFF] rounded-full animate-spin mb-4" />
                 <p className="text-sm font-bold text-[#3D3B38]">Loading Secure Checkout...</p>
                 <button onClick={() => setPaymentMode('selection')} className="text-xs font-bold text-[#8D8B86] mt-4 hover:underline">Cancel</button>
              </div>
            )}
            
            <p className="text-center text-[10px] text-[#8D8B86] mt-6 font-bold flex items-center justify-center gap-1">
              <ShieldCheck size={12}/> Secure Payment Processing
            </p>
          </div>

        </motion.div>
      </div>
    </>
  );
}
