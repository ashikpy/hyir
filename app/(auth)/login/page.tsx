"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { HyirLogo } from "@/components/ui/hyr-logo";
import SideRays from "@/components/ui/side-rays";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailFormOpen, setIsEmailFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSocialSignIn(provider: "google" | "linkedin") {
    try {
      setIsLoading(provider);
      setError("");
      await signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (err: any) {
      setError(
        err?.message ||
          `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured yet. Add ${provider.toUpperCase()}_CLIENT_ID to your .env file.`
      );
      setIsLoading(null);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setIsLoading("email");
      setError("");

      if (mode === "signup") {
        const res = await signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
          callbackURL: "/",
        });
        if (res.error) {
          setError(res.error.message || "Failed to create account.");
          setIsLoading(null);
          return;
        }
      } else {
        const res = await signIn.email({
          email,
          password,
          callbackURL: "/",
        });
        if (res.error) {
          setError(res.error.message || "Invalid email or password.");
          setIsLoading(null);
          return;
        }
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setIsLoading(null);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-zinc-50 flex items-center justify-center p-6 overflow-hidden">
      {/* Dynamic ambient lighting */}
      <div className="absolute -top-12 -right-12 w-full max-w-[900px] h-[600px] pointer-events-none overflow-hidden z-0 opacity-80">
        <SideRays
          rayColor1="#EAB308"
          rayColor2="#96c8ff"
          origin="top-right"
          speed={2.2}
          intensity={2.5}
          spread={0.1}
          tilt={0}
          saturation={0}
          blend={0.67}
          falloff={0.85}
          opacity={0.8}
        />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 animate-in fade-in duration-300">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-zinc-200 shadow-xl mb-1">
            <HyirLogo className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
            Welcome to Hyir
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Your personal job search & career command center
          </p>
        </div>

        {/* Auth Card */}
        <div className="p-7 sm:p-8 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-2xl backdrop-blur-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Social OAuth Providers */}
          <div className="space-y-3">
            {/* Google */}
            <button
              type="button"
              disabled={Boolean(isLoading)}
              onClick={() => handleSocialSignIn("google")}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-200 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isLoading === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.7 5.6 6.5 10.1 6.5z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* LinkedIn */}
            <button
              type="button"
              disabled={Boolean(isLoading)}
              onClick={() => handleSocialSignIn("linkedin")}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-200 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isLoading === "linkedin" ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              ) : (
                <svg className="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.96 0-1.74.78-1.74 1.74s.78 1.74 1.74 1.74 1.74-.78 1.74-1.74-.78-1.74-1.74-1.74Z" />
                </svg>
              )}
              <span>Continue with LinkedIn</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-zinc-900" />
            <span className="absolute bg-zinc-950 px-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              or
            </span>
          </div>

          {/* Email / Password Toggle */}
          {!isEmailFormOpen ? (
            <button
              type="button"
              onClick={() => setIsEmailFormOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer text-center"
            >
              Sign in with Email & Password
            </button>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-center p-1 rounded-xl bg-zinc-900/80 border border-zinc-800 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    mode === "signin"
                      ? "bg-white text-black font-semibold shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    mode === "signup"
                      ? "bg-white text-black font-semibold shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {mode === "signup" && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-medium text-zinc-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={Boolean(isLoading)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-white text-black text-xs font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isLoading === "email" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsEmailFormOpen(false)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  ← Back to social logins
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
