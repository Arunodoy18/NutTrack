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
          scanner.stop().catch(() => {});
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
        scanner.stop().then(() => scanner.clear()).catch(() => scanner.clear());
      } catch (e) {
        scanner.clear();
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="w-full max-w-sm mx-auto bg-black rounded-[24px] overflow-hidden flex items-center justify-center min-h-[250px]">
      <div id="barcode-reader" className="w-full"></div>
    </div>
  );
}
