"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ScanBarcode, Search, Plus, Check, AlertTriangle, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
  onClose: () => void;
  onFoodFound: (food: { name: string; calories: number; protein: number; fat: number; fiber: number; estimatedQuantity: string }) => void;
}

export default function BarcodeScanner({ onClose, onFoodFound }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Initialize camera scanner
  useEffect(() => {
    if (mode === 'scan') {
      let html5QrCode: any = null;

      const startScanner = async () => {
        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          html5QrCode = new Html5Qrcode("barcode-reader");
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 280, height: 150 },
              aspectRatio: 1.5,
            },
            (decodedText: string) => {
              // Success - barcode detected
              html5QrCode.stop().catch(() => {});
              lookupBarcode(decodedText);
            },
            () => {} // Ignore scan failures (continuous scanning)
          );
        } catch (err) {
          console.error("Scanner error:", err);
          setMode('manual');
        }
      };

      // Small delay to ensure DOM is ready
      const timer = setTimeout(startScanner, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode) {
          html5QrCode.stop().catch(() => {});
        }
      };
    }
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const fetchWithTimeout = async (url: string, ms = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  const lookupBarcode = async (barcode: string) => {
    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Try Open Food Facts (free, no API key)
      const offRes = await fetchWithTimeout(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, 5000);
      const offData = await offRes.json();

      if (offData.status === 1 && offData.product) {
        const product = offData.product;
        const nutriments = product.nutriments || {};
        
        const food = {
          name: product.product_name || product.product_name_en || "Unknown Product",
          calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
          protein: Math.round(nutriments.proteins_100g || nutriments.proteins || 0),
          fat: Math.round(nutriments.fat_100g || nutriments.fat || 0),
          fiber: Math.round(nutriments.fiber_100g || nutriments.fiber || 0),
          estimatedQuantity: product.quantity || product.serving_size || "100g",
          brand: product.brands || "",
          image: product.image_front_small_url || null,
          servingSize: product.serving_size || "100g",
          barcode: barcode,
        };

        setResult(food);
        setIsSearching(false);
        return;
      }

      // Step 2: Fallback - Try USDA FoodData Central
      const usdaKey = "DEMO_KEY"; // Free tier allows 30 requests/hour
      const usdaRes = await fetchWithTimeout(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${barcode}&pageSize=1`, 5000);
      const usdaData = await usdaRes.json();

      if (usdaData.foods && usdaData.foods.length > 0) {
        const food = usdaData.foods[0];
        const nutrients = food.foodNutrients || [];
        
        const getVal = (name: string) => {
          const n = nutrients.find((n: any) => n.nutrientName?.toLowerCase().includes(name.toLowerCase()));
          return Math.round(n?.value || 0);
        };

        setResult({
          name: food.description || "Unknown",
          calories: getVal("energy"),
          protein: getVal("protein"),
          fat: getVal("total lipid") || getVal("fat"),
          fiber: getVal("fiber"),
          estimatedQuantity: "100g",
          brand: food.brandName || "",
          image: null,
          servingSize: "100g",
          barcode: barcode,
        });
        setIsSearching(false);
        return;
      }

      setError(`Barcode "${barcode}" not found in any database. Try entering the food manually.`);
    } catch (err) {
      console.error("Lookup error:", err);
      setError("Network error. Check your connection and try again.");
    }
    setIsSearching(false);
  };

  const handleManualSearch = () => {
    if (manualBarcode.trim().length > 0) {
      lookupBarcode(manualBarcode.trim());
    }
  };

  const handleAddFood = () => {
    if (result) {
      onFoodFound({
        name: result.name,
        calories: result.calories,
        protein: result.protein,
        fat: result.fat,
        fiber: result.fiber,
        estimatedQuantity: result.estimatedQuantity,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#3D3B38]/60 backdrop-blur-sm">
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-lg bg-[#FFFFFF] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-[#EBE8E0]">
          <div className="flex items-center gap-2">
            <ScanBarcode size={18} className="text-[#635BFF]" />
            <h3 className="text-[15px] font-black text-[#3D3B38]">Barcode Scanner</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F7F5F0] text-[#3D3B38]"><X size={16}/></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {/* Mode Toggle */}
          <div className="flex bg-[#F7F5F0] rounded-xl p-1 border border-[#EBE8E0]">
            <button onClick={() => setMode('scan')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'scan' ? 'bg-[#FFFFFF] text-[#3D3B38] shadow-sm' : 'text-[#8D8B86]'}`}>
              📷 Camera Scan
            </button>
            <button onClick={() => { setMode('manual'); if (scannerRef.current) scannerRef.current.stop().catch(() => {}); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'manual' ? 'bg-[#FFFFFF] text-[#3D3B38] shadow-sm' : 'text-[#8D8B86]'}`}>
              ⌨️ Enter Barcode
            </button>
          </div>

          {/* Camera Scanner */}
          {mode === 'scan' && !result && !isSearching && (
            <div className="space-y-3">
              <div id="barcode-reader" ref={scannerContainerRef} className="w-full rounded-2xl overflow-hidden border border-[#EBE8E0] bg-black min-h-[200px]" />
              <p className="text-[10px] font-bold text-[#8D8B86] text-center">Point your camera at the barcode on the product packaging</p>
            </div>
          )}

          {/* Manual Input */}
          {mode === 'manual' && !result && !isSearching && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-[#8D8B86] uppercase block mb-1">Barcode Number</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualBarcode} 
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    placeholder="e.g. 8901058852509"
                    className="flex-1 bg-[#F7F5F0] border border-[#EBE8E0] px-4 py-3 rounded-xl text-sm font-bold text-[#3D3B38] focus:outline-none focus:border-[#635BFF]"
                  />
                  <button onClick={handleManualSearch} className="bg-[#635BFF] text-white px-4 rounded-xl active:scale-95 transition-all">
                    <Search size={18} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] font-bold text-[#8D8B86] text-center">Find the barcode number printed below the barcode lines on the packaging</p>
            </div>
          )}

          {/* Loading */}
          {isSearching && (
            <div className="py-12 flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-[#635BFF] animate-spin" />
              <p className="text-sm font-bold text-[#3D3B38]">Searching databases...</p>
              <p className="text-[10px] font-bold text-[#8D8B86]">Checking Open Food Facts & USDA</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center space-y-2">
              <AlertTriangle size={24} className="text-red-400 mx-auto" />
              <p className="text-xs font-bold text-red-500">{error}</p>
              <button onClick={() => { setError(null); setResult(null); }} className="text-[10px] font-bold text-[#635BFF] underline">Try Again</button>
            </div>
          )}

          {/* Result */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#EBE8E0]">
                <div className="flex items-start gap-3">
                  {result.image && (
                    <img src={result.image} alt={result.name} className="w-16 h-16 rounded-xl object-cover border border-[#EBE8E0]" />
                  )}
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-[#3D3B38] leading-tight">{result.name}</h4>
                    {result.brand && <p className="text-[10px] font-bold text-[#8D8B86] mt-0.5">{result.brand}</p>}
                    <p className="text-[9px] font-bold text-[#635BFF] mt-1">Per {result.servingSize}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EBE8E0] text-center">
                  <span className="text-[8px] font-black text-[#8D8B86] uppercase block">Cals</span>
                  <span className="text-lg font-black text-[#3D3B38]">{result.calories}</span>
                </div>
                <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EBE8E0] text-center">
                  <span className="text-[8px] font-black text-[#83B593] uppercase block">Protein</span>
                  <span className="text-lg font-black text-[#3D3B38]">{result.protein}g</span>
                </div>
                <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EBE8E0] text-center">
                  <span className="text-[8px] font-black text-[#E67F63] uppercase block">Fat</span>
                  <span className="text-lg font-black text-[#3D3B38]">{result.fat}g</span>
                </div>
                <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EBE8E0] text-center">
                  <span className="text-[8px] font-black text-[#5C99D6] uppercase block">Fiber</span>
                  <span className="text-lg font-black text-[#3D3B38]">{result.fiber}g</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setResult(null); setError(null); setManualBarcode(''); }} className="flex-1 py-4 bg-[#F7F5F0] text-[#3D3B38] rounded-2xl font-bold text-sm border border-[#EBE8E0] active:scale-95 transition-all">
                  Scan Another
                </button>
                <button onClick={handleAddFood} className="flex-1 py-4 bg-[#83B593] text-white rounded-2xl font-bold text-sm shadow-[0_8px_20px_rgba(131,181,147,0.3)] active:scale-95 transition-all flex justify-center items-center gap-2">
                  <Plus size={16} /> Add to Meal
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
