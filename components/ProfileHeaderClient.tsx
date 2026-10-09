"use client";

import React, { useState } from 'react';
import { Settings, Camera, X, Upload, Palette, FileText, Shield } from 'lucide-react';
import Link from 'next/link';

export default function ProfileHeaderClient({
  name,
  email,
  initial,
  image,
  analyticsProfile,
}: {
  name: string;
  email: string;
  initial: string;
  image?: string | null;
  analyticsProfile: any;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [avatarMode, setAvatarMode] = useState<'initial' | 'photo'>('initial');
  const [avatarBg, setAvatarBg] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
  };

  const gradients = [
    "from-brand to-[#e63e00]", // 0: Orange
    "from-blue-500 to-blue-700", // 1: Blue
    "from-emerald-400 to-emerald-600", // 2: Green
    "from-purple-500 to-purple-700", // 3: Purple
    "from-rose-400 to-rose-600" // 4: Pink
  ];

  return (
    <>
      {/* Header Block */}
      <div className="relative mb-8 pt-4">
        <button 
          onClick={() => setShowSettings(true)}
          className="absolute top-0 right-0 p-2 text-ink-soft hover:text-ink transition-colors"
        >
          <Settings className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-5 mt-4">
          <button 
            onClick={() => setShowAvatar(true)}
            className="relative group focus:outline-none"
          >
            {((image || selectedImage) && avatarMode !== 'initial') ? (
              <img 
                src={selectedImage || image!} 
                alt={name}
                className="w-20 h-20 rounded-[28px] object-cover shadow-lg shadow-brand/20 transition-transform group-hover:scale-105"
              />
            ) : (
              <div className={`w-20 h-20 bg-gradient-to-br ${gradients[avatarBg]} text-white font-black text-3xl rounded-[28px] flex items-center justify-center shadow-lg shadow-brand/20 transition-transform group-hover:scale-105`}>
                {initial}
              </div>
            )}
            
            {/* Camera Badge */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-surface-line">
              <Camera className="w-4 h-4 text-ink-soft" />
            </div>
          </button>
          
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight mb-1">{name}</h1>
            <p className="text-sm font-bold text-blue-600 underline underline-offset-2 opacity-80 hover:opacity-100 cursor-pointer line-clamp-1">
              {email}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sheet (Your Body Metrics) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-surface w-full max-w-lg rounded-t-[32px] p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-ink">Your body metrics</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-surface-muted rounded-full">
                <X className="w-5 h-5 text-ink-soft" />
              </button>
            </div>

            <div className="space-y-4">
              {/* BMI & BMR Row */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
                  <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">BMI</div>
                  <div className="text-3xl font-black text-ink leading-none">{analyticsProfile.bmi.value}</div>
                  <div className="mt-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      analyticsProfile.bmi.label === 'Normal' || analyticsProfile.bmi.label === 'Growing' ? 'bg-emerald-50 text-emerald-600' : 
                      analyticsProfile.bmi.label === 'Underweight' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-500'
                    }`}>
                      {analyticsProfile.bmi.label}
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-surface-line">
                  <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-2">BMR</div>
                  <div className="text-3xl font-black text-ink leading-none">{analyticsProfile.bmr}</div>
                  <div className="text-[10px] font-medium text-ink-soft mt-2 leading-tight">kcal at rest</div>
                </div>
              </div>

              {/* TDEE Row */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-surface-line flex justify-between items-center">
                <div>
                  <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase mb-1">TDEE</div>
                  <div className="text-2xl font-black text-ink leading-none">{analyticsProfile.tdee} <span className="text-sm font-bold text-ink-soft">kcal / day</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium text-ink-soft max-w-[120px]">
                    Total daily energy expenditure
                  </div>
                </div>
              </div>

              {/* Fat-Free Mass Row */}
              <div className="bg-gradient-to-br from-[#fff8f5] to-[#fff1ec] rounded-[24px] p-5 shadow-sm border border-brand/20 flex justify-between items-center">
                <div>
                  <div className="text-[9px] font-mono font-bold tracking-[0.15em] text-brand uppercase mb-1">Fat-Free Mass</div>
                  <div className="text-2xl font-black text-ink leading-none">{analyticsProfile.ffm} <span className="text-sm font-bold text-ink-soft">kg</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-brand bg-brand/10 px-3 py-1.5 rounded-full">
                    Gold Metric
                  </div>
                </div>
              </div>
              
              {/* Shortcut to Avatar Editor */}
              <button 
                onClick={() => { setShowSettings(false); setShowAvatar(true); }}
                className="w-full flex justify-between items-center bg-white rounded-[24px] p-5 mt-2 border border-surface-line shadow-sm active:scale-[0.99] transition-transform"
              >
                <span className="text-sm font-bold text-ink flex items-center gap-2">
                  <Camera className="w-4 h-4 text-ink-soft" />
                  Profile picture
                </span>
                <span className="text-xs font-bold text-brand">Edit</span>
              </button>

              {/* Legal Links */}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-surface-line">
                <Link href="/privacy" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-muted transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-ink">Privacy Policy</span>
                </Link>
                <Link href="/terms" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-muted transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-ink">Terms of Service</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Editor Sheet */}
      {showAvatar && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-surface w-full max-w-lg rounded-t-[32px] p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-ink">Edit Avatar</h2>
              <button onClick={() => setShowAvatar(false)} className="p-2 bg-surface-muted rounded-full">
                <X className="w-5 h-5 text-ink-soft" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-white rounded-full p-1 border border-surface-line shadow-sm mb-6">
              <button
                onClick={() => setAvatarMode('initial')}
                className={`flex-1 flex justify-center items-center gap-2 text-xs font-bold py-2.5 rounded-full transition-all ${
                  avatarMode === 'initial'
                  ? 'bg-surface-muted text-ink shadow-sm border border-surface-line/50' 
                  : 'text-ink-soft hover:text-ink hover:bg-surface/50'
                }`}
              >
                <Palette className="w-4 h-4" />
                Create avatar
              </button>
              <button
                onClick={() => setAvatarMode('photo')}
                className={`flex-1 flex justify-center items-center gap-2 text-xs font-bold py-2.5 rounded-full transition-all ${
                  avatarMode === 'photo'
                  ? 'bg-surface-muted text-ink shadow-sm border border-surface-line/50' 
                  : 'text-ink-soft hover:text-ink hover:bg-surface/50'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload photo
              </button>
            </div>

            {avatarMode === 'initial' ? (
              <div className="space-y-6">
                <div className="flex justify-center mb-4">
                  <div className={`w-32 h-32 bg-gradient-to-br ${gradients[avatarBg]} text-white font-black text-5xl rounded-[40px] flex items-center justify-center shadow-lg shadow-brand/20 transition-colors`}>
                    {initial}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-ink-soft uppercase text-center mb-4">Pick a color</div>
                  <div className="flex justify-center gap-3">
                    {gradients.map((grad, i) => (
                      <button
                        key={i}
                        onClick={() => setAvatarBg(i)}
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${grad} transition-all ${
                          avatarBg === i ? 'ring-4 ring-brand ring-offset-2 scale-110' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleFileChange}
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-surface-line bg-white rounded-[24px] overflow-hidden flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition-colors relative"
                >
                  {selectedImage ? (
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center">
                        <Upload className="w-5 h-5 text-brand" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-ink mb-1">Tap to upload a photo</div>
                        <div className="text-xs font-medium text-ink-soft">JPG, PNG or GIF (max. 2MB)</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setShowAvatar(false)}
              className="w-full mt-6 bg-brand text-white font-bold py-4 rounded-full shadow-lg shadow-brand/30 active:scale-[0.98] transition-transform"
            >
              Save changes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
