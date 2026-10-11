"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { CameraOff } from "lucide-react";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

// Retail product codes only: fewer false positives and faster decoding than "every format".
const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

export default function BarcodeScanner({ onScanSuccess, onScanError }: BarcodeScannerProps) {
  // Keep the latest callbacks in refs: the parent passes new inline functions every render,
  // and listing them as effect dependencies used to tear down and restart the camera each time.
  const onSuccessRef = useRef(onScanSuccess);
  const onErrorRef = useRef(onScanError);
  onSuccessRef.current = onScanSuccess;
  onErrorRef.current = onScanError;
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let started = false;
    const scanner = new Html5Qrcode("barcode-reader", {
      formatsToSupport: FORMATS,
      useBarCodeDetectorIfSupported: true, // native, hardware-accelerated detector when the browser has one
      verbose: false,
    });

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          // html5-qrcode only decodes inside this box, so make it wide: real EAN-13 packs are ~4:1 and
          // were being cropped by the old fixed 260x140 box. Scales with the viewfinder.
          qrbox: (vw: number, vh: number) => {
            const width = Math.floor(Math.min(vw, 560) * 0.92);
            return { width, height: Math.max(110, Math.min(Math.floor(vh * 0.5), Math.floor(width * 0.5))) };
          },
        },
        (decodedText) => {
          if (active) onSuccessRef.current(decodedText);
        },
        (error) => {
          if (active) onErrorRef.current?.(error);
        }
      )
      .then(() => {
        started = true;
        // The component may have unmounted while the camera was starting.
        if (!active) scanner.stop().then(() => scanner.clear()).catch(() => {});
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = String((err as Error)?.message ?? err);
        setFailure(
          /permission|denied|notallowed/i.test(msg)
            ? "Camera permission is blocked. Allow camera access for Nura in your phone's settings, then try again."
            : /notfound|no camera|requested device/i.test(msg)
              ? "No camera was found on this device."
              : "Couldn't start the camera. Close other apps using it and try again."
        );
      });

    return () => {
      active = false;
      if (started) {
        // Stopping a scanner that isn't running throws; swallow it.
        scanner.stop().then(() => scanner.clear()).catch(() => {
          try { scanner.clear(); } catch { /* ignore */ }
        });
      }
    };
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto bg-black rounded-[24px] overflow-hidden flex items-center justify-center min-h-[250px] relative">
      <div id="barcode-reader" className="w-full" />
      {failure && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white bg-black/90">
          <CameraOff className="w-10 h-10 mb-3 text-white/60" />
          <p className="text-sm font-medium text-white/80 leading-relaxed">{failure}</p>
        </div>
      )}
    </div>
  );
}
