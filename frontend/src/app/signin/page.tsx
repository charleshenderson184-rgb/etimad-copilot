"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { useAuth } from "@/lib/auth";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      titleAr="مرحبًا بعودتك"
      subtitle="Sign in to continue analyzing tenders."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="text-emerald-700 font-medium hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-stone-700 mb-1.5">
            <span>Email</span>
            <span className="text-stone-400" dir="rtl">
              البريد
            </span>
          </label>
          <input
            type="email"
            value={email}
            required
            autoComplete="email"
            placeholder="you@company.com"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-shadow"
          />
        </div>

        <div>
          <label className="flex items-center justify-between text-xs font-medium text-stone-700 mb-1.5">
            <span>Password</span>
            <Link
              href="#"
              className="text-xs text-emerald-700 hover:underline"
            >
              Forgot?
            </Link>
          </label>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-shadow"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
        >
          {submitting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400 uppercase tracking-wider">
          Or
        </span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      <button className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white ring-1 ring-stone-200 text-sm font-medium text-stone-700 hover:ring-stone-300 hover:shadow-sm transition-all">
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>
    </AuthShell>
  );
}
