"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Check } from "lucide-react";

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

      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setMessage("OTP sent to your email!");
      setStep(2);
    } catch (err: any) {
      setError(err.message);
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

      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setMessage("Password reset successfully! Redirecting...");
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-surface-muted border border-[#DCDCE1] rounded-xl px-4 py-3 text-ink font-medium placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";
  const labelCls = "block text-[11px] font-bold uppercase tracking-wide text-[#8C8C94] mb-1.5";
  const btnCls =
    "w-full py-3.5 rounded-2xl bg-gradient-to-br from-brand to-brand-600 text-white font-display font-bold text-base shadow-lg shadow-brand/25 flex justify-center items-center hover:brightness-105 transition disabled:opacity-60";

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4">
      <div className="w-full max-w-md bg-white border border-surface-line rounded-[28px] p-8 shadow-xl shadow-black/[0.04]">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="font-display font-extrabold text-[36px] leading-none tracking-tight text-ink mt-5">
          Reset password
        </h1>
        <p className="text-ink-soft mt-2 leading-relaxed">
          {step === 1
            ? "Enter your email and we'll send a 6-digit code to reset your password."
            : "Enter the code we sent and choose a new password."}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mt-6 text-sm font-medium">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 mt-6 text-sm font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-4 mt-6">
            <div>
              <label className={labelCls}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4 mt-6">
            <div>
              <label className={labelCls}>Verification code</label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-surface-muted border border-[#DCDCE1] rounded-xl px-4 py-3.5 text-ink text-center text-2xl font-mono font-semibold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                placeholder="––––––"
                maxLength={6}
              />
            </div>
            <div>
              <label className={labelCls}>New password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset password"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-ink-soft hover:text-ink text-sm font-bold py-2"
            >
              Use a different email
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-ink-soft">
          Remembered your password?{" "}
          <Link href="/auth/login" className="font-bold text-brand hover:text-brand-600">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
