"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "RESET_PASSWORD" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setMessage(data.message || "OTP sent to your email!");
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Connection issue. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, type: "RESET_PASSWORD", newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password. Please try again.");
      }

      setMessage(data.message || "Password reset successfully! Redirecting...");
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Connection issue. Check your internet and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-card border border rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-txt mb-2 text-center">Reset Password</h1>
        <p className="text-txt-2 text-center mb-8">
          {step === 1 ? "Enter your email to receive an OTP" : "Enter the OTP and your new password"}
        </p>
        
        {error && <div className="bg-red/10 border border-red-500/50 text-red rounded-lg p-3 mb-6 text-sm text-center">{error}</div>}
        {message && <div className="bg-green/10 border border-emerald-500/50 text-green rounded-lg p-3 mb-6 text-sm text-center">{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-txt-2 mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-col border border-s rounded-lg px-4 py-3 text-txt focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-txt font-medium rounded-lg px-4 py-3 transition flex justify-center items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-txt-2 mb-1">6-Digit OTP</label>
              <input 
                type="text" 
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-col border border-s rounded-lg px-4 py-3 text-txt focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center tracking-[0.5em] font-mono text-xl"
                placeholder="123456"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-txt-2 mb-1">New Password</label>
              <input 
                type="password" 
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-col border border-s rounded-lg px-4 py-3 text-txt focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-txt font-medium rounded-lg px-4 py-3 transition flex justify-center items-center mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="w-full text-txt-2 hover:text-txt text-sm py-2"
            >
              Go back
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-txt-2">
          Remembered your password? <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
