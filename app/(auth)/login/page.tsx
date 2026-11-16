"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { HyirLogo } from "@/components/ui/hyr-logo";
import BlurText from "@/components/ui/blur-text";
import ShinyText from "@/components/ui/shiny-text";
import { LoginPreview } from "@/components/ui/login-preview";
import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";

type AuthMethod = "google" | "linkedin" | "email";
const LAST_USED_KEY = "hyir:last-auth-method";

function rememberMethod(method: AuthMethod) {
  try {
    localStorage.setItem(LAST_USED_KEY, method);
  } catch {}
}

function LastUsedTag({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`absolute -top-2 right-3 px-1.5 py-px rounded-md text-[10px] font-medium tracking-wide border ${
        light
          ? "bg-violet-600 text-white border-violet-400/60"
          : "bg-zinc-900 text-violet-300 border-violet-400/30"
      }`}
    >
      Last used
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z" />
      <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.7 5.6 6.5 10.1 6.5z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailStep, setEmailStep] = useState<"email" | "password">("email");
  const [lastUsed, setLastUsed] = useState<AuthMethod | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_USED_KEY);
      if (stored === "google" || stored === "linkedin" || stored === "email") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only; read after mount to avoid hydration mismatch
        setLastUsed(stored);
      }
    } catch {}
  }, []);

  async function handleSocialSignIn(provider: "google" | "linkedin") {
    try {
      setIsLoading(provider);
      setError("");
      rememberMethod(provider);
      await signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (err: unknown) {
      setError(
        (err instanceof Error && err.message) ||
          `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured yet. Add ${provider.toUpperCase()}_CLIENT_ID to your .env file.`
      );
      setIsLoading(null);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (emailStep === "email") {
      if (!email.trim()) return;
      setError("");
      setEmailStep("password");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
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

      rememberMethod("email");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError((err instanceof Error && err.message) || "Something went wrong.");
      setIsLoading(null);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-zinc-50 grid lg:grid-cols-2 overflow-hidden">

      {/* Subtle grid, fades out toward the edges */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)]"
      />

      <div className="relative z-10 flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-300">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-zinc-200 shadow-xl mb-1">
            <HyirLogo className="w-7 h-7 text-black" />
          </div>
          <h1 className="flex justify-center text-2xl sm:text-3xl font-light tracking-tight text-white">
            <BlurText
              text="Welcome to Hyir"
              trigger="load"
              animateBy="words"
              delay={120}
            />
          </h1>
          <p className="text-xs sm:text-sm">
            <ShinyText
              text="Your personal job search & career command center"
              color="#a1a1aa"
              shineColor="#ffffff"
              speed={4}
            />
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full overflow-hidden rounded-[20px] bg-zinc-950 border border-white/10 shadow-2xl shadow-black/60">
          <div className="p-6 sm:p-7 space-y-5">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 font-medium leading-relaxed"
              >
                {error}
              </div>
            )}

            {/* Social OAuth Providers */}
            <div className="space-y-2.5">
              {/* Google: primary */}
              <button
                type="button"
                disabled={Boolean(isLoading)}
                onClick={() => handleSocialSignIn("google")}
                className="group relative w-full h-11 flex items-center justify-center gap-2.5 px-4 rounded-xl bg-white text-zinc-950 text-sm font-medium shadow-[inset_0_-2px_0_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.4)] hover:bg-zinc-100 active:translate-y-px transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading === "google" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                ) : (
                  <GoogleIcon />
                )}
                <span>Continue with Google</span>
                {lastUsed === "google" && <LastUsedTag light />}
              </button>

              {/* LinkedIn: secondary */}
              <button
                type="button"
                disabled={Boolean(isLoading)}
                onClick={() => handleSocialSignIn("linkedin")}
                className="relative w-full h-11 flex items-center justify-center gap-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 text-sm font-medium text-zinc-200 active:translate-y-px transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading === "linkedin" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : (
                  <svg className="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24" aria-hidden>
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.96 0-1.74.78-1.74 1.74s.78 1.74 1.74 1.74 1.74-.78 1.74-1.74-.78-1.74-1.74-1.74Z" />
                  </svg>
                )}
                <span>Continue with LinkedIn</span>
                {lastUsed === "linkedin" && <LastUsedTag />}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3" aria-hidden>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
              <span className="text-[11px] text-zinc-500">or</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>

            {/* Email-first form */}
            <form onSubmit={handleEmailAuth} className="space-y-2.5">
              {mode === "signup" && emailStep === "password" && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name (optional)"
                  autoComplete="name"
                  aria-label="Full name"
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10 transition-all animate-in fade-in slide-in-from-top-1 duration-200"
                />
              )}

              {emailStep === "email" ? (
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    aria-label="Email address"
                    required
                    className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10 transition-all"
                  />
                  <button
                    type="submit"
                    aria-label="Continue with email"
                    disabled={!email.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-lg bg-white/10 text-zinc-300 enabled:bg-white enabled:text-zinc-950 enabled:hover:bg-zinc-200 transition-colors cursor-pointer disabled:cursor-default"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {lastUsed === "email" && <LastUsedTag />}
                </div>
              ) : (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailStep("email");
                      setPassword("");
                      setError("");
                    }}
                    className="w-full h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-zinc-300 hover:border-white/15 transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-zinc-500" />
                    <span className="truncate">{email}</span>
                    <span className="ml-auto text-xs text-zinc-500">Change</span>
                  </button>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Create a password" : "Password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    aria-label="Password"
                    autoFocus
                    required
                    className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={Boolean(isLoading)}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-sm font-medium active:translate-y-px transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isLoading === "email" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{mode === "signin" ? "Sign in" : "Create account"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              <p className="text-center text-xs text-zinc-500 pt-1">
                {mode === "signin" ? "New to Hyir? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError("");
                  }}
                  className="text-zinc-200 hover:text-white underline-offset-4 hover:underline cursor-pointer"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </form>
          </div>

          {/* Trust footer */}
          <div className="flex items-center justify-center gap-2 px-6 py-3.5 border-t border-white/5 bg-white/[0.015] text-[11px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
            <span>Gmail access is read-only. Hyir never sends email for you.</span>
          </div>
        </div>
      </div>
      </div>

      <LoginPreview />
    </div>
  );
}
