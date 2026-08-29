"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-900 animate-pulse">
        <div className="w-6 h-6 rounded-full bg-zinc-800" />
        <div className="h-3 w-20 bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <UserIcon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
          <span>Sign In</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">→</span>
      </Link>
    );
  }

  const user = session.user;
  const initial = user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-900/80 border border-zinc-900 hover:border-zinc-800 transition-all text-left group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-6 h-6 rounded-full object-cover shrink-0 border border-zinc-800"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-200 flex items-center justify-center shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
              {user.name || user.email.split("@")[0]}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full mb-2 left-0 right-0 z-50 p-1.5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-1 animate-in fade-in duration-100">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
