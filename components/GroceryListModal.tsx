"use client";

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, ShoppingCart, Trash2, RefreshCw } from 'lucide-react';
import { getGroceryListAction, toggleGroceryItemAction, deleteGroceryItemAction } from "@/app/actions";
import { motion } from 'framer-motion';

interface GroceryItem {
  id: string;
  ingredientName: string;
  isPurchased: boolean;
}

interface GroceryListProps {
  onClose: () => void;
}

export default function GroceryListModal({ onClose }: GroceryListProps) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    const res = await getGroceryListAction();
    if (res.success && res.list) {
      setItems(res.list as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    // Optimistic UI
    setItems(items.map(i => i.id === id ? { ...i, isPurchased: !currentStatus } : i));
    await toggleGroceryItemAction(id, !currentStatus);
  };

  const handleDelete = async (id: string) => {
    setItems(items.filter(i => i.id !== id));
    await deleteGroceryItemAction(id);
  };

  const purchasedCount = items.filter(i => i.isPurchased).length;
  const progress = items.length > 0 ? (purchasedCount / items.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-surface-muted/85 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl bg-surface-muted border border rounded-[32px] shadow-2xl flex flex-col relative max-h-[85vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border/80 sticky top-0 bg-surface-muted/90 backdrop-blur-md z-10 rounded-t-[32px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-ink tracking-tight">Grocery List</h3>
              <p className="text-xs text-ink-2">{items.length} items total</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-ink-2 hover:text-ink rounded-xl bg-white hover:bg-surface-muted transition-all focus:ring-2 focus:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-ink-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-4" />
              <p className="font-bold">Loading your list...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-surface-line shadow-md">
                <ShoppingCart className="w-8 h-8 text-ink-2" />
              </div>
              <h4 className="text-lg font-bold text-ink">Your list is empty</h4>
              <p className="text-sm text-ink-2 mt-2 max-w-sm mx-auto">Use the Fridge Raider to scan your fridge and add missing recipe ingredients here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border border-surface-line rounded-2xl p-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-ink-2 uppercase tracking-wide">Progress</span>
                  <span className="text-sm font-black text-indigo-400">{purchasedCount} / {items.length}</span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${item.isPurchased ? 'bg-surface-muted/50 border-transparent' : 'bg-white border-surface-line hover:border-indigo-500/30'}`}>
                    <button 
                      onClick={() => handleToggle(item.id, item.isPurchased)}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      {item.isPurchased ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-ink-h group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                      )}
                      <span className={`font-bold text-sm transition-all ${item.isPurchased ? 'text-ink-h line-through' : 'text-ink'}`}>
                        {item.ingredientName}
                      </span>
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-ink-h hover:text-red-500-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
