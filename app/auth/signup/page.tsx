"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Auto login after successful registration
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        router.push("/auth/login");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4">
      <div className="w-full max-w-md bg-white border border-surface-line rounded-[28px] p-8 shadow-xl shadow-black/[0.04]">
        <div className="font-display font-extrabold text-2xl tracking-tight text-ink">
          diet<span className="text-brand">Buddy</span>
        </div>
        <h1 className="font-display font-extrabold text-[40px] leading-none tracking-tight text-ink mt-5">
          Create account
        </h1>
        <p className="text-ink-soft mt-2">Start tracking in seconds</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mt-6 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-6 w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white border border-[#DCDCE1] font-bold text-ink hover:bg-[#FAFAFA] transition"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-surface-line" />
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-faint font-mono">or</span>
          <div className="flex-1 h-px bg-surface-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-[#8C8C94] mb-1.5">
              Full name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-muted border border-[#DCDCE1] rounded-xl px-4 py-3 text-ink font-medium placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
              placeholder="Arunodoy Banerjee"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-[#8C8C94] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-muted border border-[#DCDCE1] rounded-xl px-4 py-3 text-ink font-medium placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-[#8C8C94] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-muted border border-[#DCDCE1] rounded-xl px-4 py-3 text-ink font-medium placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-brand to-brand-600 text-white font-display font-bold text-base shadow-lg shadow-brand/25 flex justify-center items-center hover:brightness-105 transition disabled:opacity-60 mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-bold text-brand hover:text-brand-600">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24Z" />
      <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.4l3.8 3C6.5 6.7 9 4.8 12 4.8Z" />
    </svg>
  );
}
