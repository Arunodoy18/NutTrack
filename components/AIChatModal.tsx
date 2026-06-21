"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bot, Settings2, RefreshCw } from 'lucide-react';
import { chatWithAIAdvisorAction, updateDietaryPreferencesAction } from "@/app/actions";
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatModalProps {
  onClose: () => void;
}

export default function AIChatModal({ onClose }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi there! I'm your NutTrack AI Advisor. How can I help you with your nutrition today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    const res = await chatWithAIAdvisorAction(userMsg, newMessages.slice(1)); // exclude greeting
    if (res.success && res.reply) {
      setMessages([...newMessages, { role: 'assistant', content: res.reply }]);
      if (res.preferences && !preferences) {
        setPreferences(res.preferences);
      }
    } else {
      setMessages([...newMessages, { role: 'assistant', content: "Oops, I encountered an error connecting to my brain. Please try again later." }]);
    }
    setLoading(false);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    const res = await updateDietaryPreferencesAction(preferences);
    setSavingPrefs(false);
    if (res.success) {
      setShowSettings(false);
      alert("Preferences saved successfully!");
    } else {
      alert("Failed to save preferences.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-surface-muted/85 backdrop-blur-md overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl h-[85vh] bg-surface-muted border border rounded-[32px] shadow-2xl flex flex-col relative"
      >
        <div className="flex justify-between items-center p-6 border-b border/80 sticky top-0 bg-surface-muted/90 backdrop-blur-md z-10 rounded-t-[32px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-ink tracking-tight">AI Advisor</h3>
              <p className="text-xs text-ink-2">Personal Nutritionist</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-indigo-500/10 text-indigo-400' : 'text-ink-2 hover:text-ink bg-white hover:bg-surface-muted'}`}
              title="Dietary Preferences"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-ink-2 hover:text-ink rounded-xl bg-white hover:bg-surface-muted transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border bg-white/50 overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <label className="block text-sm font-bold text-ink mb-2">Dietary Preferences & Allergies</label>
                <textarea 
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="e.g. Vegan, allergic to peanuts, low-carb..."
                  className="w-full bg-white border border-surface-line rounded-xl p-3 text-sm text-ink focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                />
                <div className="flex justify-end mt-3">
                  <button 
                    onClick={handleSavePrefs}
                    disabled={savingPrefs}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all"
                  >
                    {savingPrefs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                    Save Preferences
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-500 rounded-tr-sm' : 'bg-white border border-surface-line text-ink rounded-tl-sm'}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex w-full justify-start">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-surface-line rounded-tl-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-75" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <div className="p-4 sm:p-6 border-t border bg-surface-muted">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative flex items-center"
          >
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for a meal suggestion..."
              className="w-full bg-white border border-surface-line rounded-2xl pl-4 pr-12 py-4 text-sm text-ink focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-indigo-500 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
