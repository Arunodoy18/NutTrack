"use client";

import React, { useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export default function BarcodeScanner({ onScanSuccess, onScanError }: BarcodeScannerProps) {
  useEffect(() => {
    let isMounted = true;
    const scanner = new Html5Qrcode("barcode-reader");

    scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 150 }
      },
      (decodedText) => {
        if (isMounted) {
          onScanSuccess(decodedText);
        }
      },
      (error) => {
        if (isMounted && onScanError) onScanError(error);
      }
    ).catch(err => {
      console.error("Error starting camera", err);
    });

    return () => {
      isMounted = false;
      try {
        // html5-qrcode throws if stop is called while not scanning, or if called twice.
        // We use a safe wrapper to stop and clear.
        scanner.stop().then(() => {
          scanner.clear();
        }).catch(() => {
          try { scanner.clear(); } catch(e) {}
        });
      } catch (e) {
        try { scanner.clear(); } catch(e2) {}
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="w-full max-w-sm mx-auto bg-black rounded-[24px] overflow-hidden flex items-center justify-center min-h-[250px]">
      <div id="barcode-reader" className="w-full"></div>
    </div>
  );
}
