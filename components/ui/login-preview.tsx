"use client";

import Prism from "@/components/ui/prism";

const STAGES = [
  { label: "Applied", count: 24, dot: "bg-zinc-300" },
  { label: "Screening", count: 9, dot: "bg-sky-300" },
  { label: "Interview", count: 4, dot: "bg-amber-300" },
  { label: "Offer", count: 1, dot: "bg-emerald-300" },
];

const ROWS = [
  { company: "Linear", role: "Product Designer", status: "Interview" },
  { company: "Stripe", role: "Senior Designer", status: "Screening" },
  { company: "Vercel", role: "Design Engineer", status: "Applied" },
];

export function LoginPreview() {
  return (
    <div className="relative z-10 hidden lg:flex">
      <div className="relative isolate w-full overflow-hidden bg-black [container-type:size]">
        {/* Prism rotated 90deg so its apex sits on the right edge and the beams fan left, toward the sign-in form */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[100cqw] w-[100cqh] -translate-x-1/2 -translate-y-1/2 rotate-90"
        >
          <Prism
            animationType="rotate"
            timeScale={0.4}
            scale={5}
            glow={1.2}
            noise={0}
            hueShift={0}
            colorFrequency={1}
            interactive={false}
          />
        </div>
        {/* Darken the bottom for the stats card */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/40 via-35% to-transparent" />

        <div className="relative flex h-full flex-col justify-end p-10 gap-8">
          <div className="space-y-2 max-w-sm">
            <p className="text-2xl font-light tracking-tight text-white">
              Every application, one place.
            </p>
            <p className="text-sm text-zinc-300">
              Track stages, follow-ups and contacts without the spreadsheet.
            </p>
          </div>

          <div
            aria-hidden
            className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-5 space-y-5"
          >
            <div className="grid grid-cols-4 gap-3">
              {STAGES.map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </div>
                  <div className="text-xl font-light text-white tabular-nums">
                    {s.count}
                  </div>
                </div>
              ))}
            </div>
            <div className="divide-y divide-white/5 border-t border-white/5">
              {ROWS.map((r) => (
                <div
                  key={r.company}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div>
                    <span className="text-zinc-100">{r.company}</span>
                    <span className="text-zinc-500"> · {r.role}</span>
                  </div>
                  <span className="text-zinc-400">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
