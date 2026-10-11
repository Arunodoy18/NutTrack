"use client";

import { useState, useEffect, useCallback } from 'react';

// Extend window object for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    /** Present only inside the installed Android app (its web view has no built-in speech recognition). */
    NuraNative?: { startSpeech: () => void; stopSpeech: () => void };
    __nuraSpeech?: (e: { type: 'result' | 'end' | 'error'; text?: string; message?: string }) => void;
    webkitSpeechRecognition: any;
  }
}

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const native = window.NuraNative;
      if (!SpeechRecognition && native?.startSpeech) {
        window.__nuraSpeech = (e) => {
          if (e.type === 'result') setTranscript(e.text ?? '');
          else if (e.type === 'error') { setError(e.message ?? 'Speech recognition failed'); setIsListening(false); }
          else setIsListening(false);
        };
        setRecognition({ start: () => native.startSpeech(), stop: () => native.stopSpeech() });
        return () => { window.__nuraSpeech = undefined; };
      }
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setError(event.error);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      } else {
        setError('Speech recognition is not supported in this browser.');
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition) {
      setError(null);
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
    isSupported: !!recognition
  };
}
