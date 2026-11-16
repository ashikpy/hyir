"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { LogOut, User as UserIcon, ChevronsUpDown } from "lucide-react";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex items-center gap-2.5 h-11 px-2 rounded-lg animate-pulse">
        <div className="w-7 h-7 rounded-full bg-zinc-800" />
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
        className="w-full flex items-center justify-between h-11 px-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/10"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-1 ring-white/10 text-[11px] font-semibold text-white flex items-center justify-center shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-zinc-200 group-hover:text-white truncate leading-tight">
              {user.name || user.email.split("@")[0]}
            </p>
            <p className="text-[11px] text-zinc-500 truncate leading-tight">{user.email}</p>
          </div>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full mb-2 left-0 right-0 z-50 p-1 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-bottom-1 duration-150">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-[13px] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
