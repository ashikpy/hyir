import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";
import { format, isToday, isPast } from "date-fns";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { CompanyLogo } from "@/components/ui/avatars";
import SideRays from "@/components/ui/side-rays";

// Ensure dynamic rendering to always fetch latest data
export const dynamic = "force-dynamic";

async function getDashboardData() {
  const totalApps = await prisma.application.count();
  const activeApps = await prisma.application.count({
    where: {
      status: {
        in: ["APPLIED", "CONTACTED", "INTERVIEW", "ASSIGNMENT"],
      },
    },
  });
  const interviews = await prisma.application.count({
    where: { status: "INTERVIEW" },
  });
  const offers = await prisma.application.count({
    where: { status: "OFFER" },
  });
  const rejections = await prisma.application.count({
    where: { status: "REJECTED" },
  });
  const recentApps = await prisma.application.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  const followUps = await prisma.application.findMany({
    where: {
      nextFollowUpDate: { not: null },
      status: { notIn: ["REJECTED", "ACCEPTED", "WITHDRAWN", "GHOSTED"] },
    },
    orderBy: { nextFollowUpDate: "asc" },
    take: 5,
  });

  // Get triage statistics
  const allAppsForTriage = await prisma.application.findMany({
    select: {
      status: true,
      applicationUrl: true,
      contactName: true,
      dateApplied: true,
      salary: true,
    },
  });

  let draftsCount = 0;
  let missingLinksCount = 0;
  let missingDatesCount = 0;
  let missingContactsCount = 0;
  let totalTriageCount = 0;

  for (const app of allAppsForTriage) {
    const isDraft = app.status === "SAVED";
    const hasNoUrl = !app.applicationUrl;
    const hasNoDate = !app.dateApplied && !isDraft;
    const hasNoContact = !app.contactName && !isDraft;
    const hasNoSalary = !app.salary || app.salary.trim() === "";

    if (isDraft) draftsCount++;
    if (hasNoUrl) missingLinksCount++;
    if (hasNoDate) missingDatesCount++;
    if (hasNoContact) missingContactsCount++;

    if (isDraft || hasNoUrl || hasNoDate || hasNoContact || hasNoSalary) {
      totalTriageCount++;
    }
  }

  return {
    totalApps,
    activeApps,
    interviews,
    offers,
    rejections,
    recentApps,
    followUps,
    triageStats: {
      total: totalTriageCount,
      drafts: draftsCount,
      missingLinks: missingLinksCount,
      missingDates: missingDatesCount,
      missingContacts: missingContactsCount,
    },
  };
}

function MetricBlock({ label, value, highlightColor }: { label: string; value: number; highlightColor?: string }) {
  return (
    <div className="flex flex-col py-6 border-b border-zinc-900">
      <span className={`text-4xl font-light tracking-tight mb-2 ${highlightColor || 'text-white'}`}>
        {value}
      </span>
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const statusConfig: Record<ApplicationStatus, string> = {
    SAVED: "text-zinc-500 border-zinc-800",
    APPLIED: "text-blue-400 border-blue-400/20 bg-blue-950/30",
    CONTACTED: "text-purple-400 border-purple-400/20 bg-purple-950/30",
    SCREENING: "text-amber-400 border-amber-400/20 bg-amber-950/30",
    INTERVIEW: "text-orange-400 border-orange-400/20 bg-orange-950/30",
    ASSIGNMENT: "text-indigo-400 border-indigo-400/20 bg-indigo-950/30",
    OFFER: "text-emerald-400 border-emerald-400/20 bg-emerald-950/30",
    ACCEPTED: "text-emerald-500 border-emerald-500/20 bg-emerald-950/30",
    REJECTED: "text-rose-400 border-rose-400/20 bg-rose-950/30",
    GHOSTED: "text-zinc-500 border-zinc-800",
    WITHDRAWN: "text-zinc-500 border-zinc-800",
  };

  const config = statusConfig[status] || statusConfig.SAVED;

  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 border rounded-full ${config}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default async function Dashboard() {
  const data = await getDashboardData();

  // State detection:
  // 1. Urgent: Overdue follow-up tasks
  // 2. Good News: Active job offers / accepted positions
  // 3. Calm: Standard neutral dashboard
  const hasOverdue = data.followUps.some((app) => {
    if (!app.nextFollowUpDate) return false;
    const date = new Date(app.nextFollowUpDate);
    return isPast(date) && !isToday(date);
  });
  const hasGoodNews = data.offers > 0;

  const rayConfig = hasOverdue
    ? {
        rayColor1: "#ffecb0",
        rayColor2: "#ff8a8a",
        saturation: 0.6,
        speed: 2.4,
        intensity: 2.6,
      }
    : hasGoodNews
      ? {
          rayColor1: "#38bdf8",
          rayColor2: "#818cf8",
          saturation: 0.9,
          speed: 2.5,
          intensity: 2.7,
        }
      : {
          rayColor1: "#EAB308",
          rayColor2: "#96c8ff",
          saturation: 0,
          speed: 2.3,
          intensity: 2.6,
        };

  return (
    <div className="relative space-y-16 pb-20">
      {/* SideRays: Dynamic ambient lighting (Red for urgent, Blue for good news, Monochrome for calm) */}
      <div className="absolute -top-12 -right-12 w-full max-w-[1100px] h-[650px] pointer-events-none overflow-hidden z-0 opacity-85">
        <SideRays
          rayColor1={rayConfig.rayColor1}
          rayColor2={rayConfig.rayColor2}
          origin="top-right"
          speed={rayConfig.speed}
          intensity={rayConfig.intensity}
          spread={0.1}
          tilt={0}
          saturation={rayConfig.saturation}
          blend={0.67}
          falloff={0.85}
          opacity={0.8}
        />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <h1 className="text-4xl font-light tracking-tight mb-2">Overview</h1>
        <p className="text-zinc-400 text-sm">
          Where your job search stands right now.
        </p>
      </header>

      {/* Metrics Row */}
      <section className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-4">
        <MetricBlock label="Total Applied" value={data.totalApps} />
        <MetricBlock label="Active" value={data.activeApps} />
        <MetricBlock label="Interviews" value={data.interviews} />
        <MetricBlock label="Offers" value={data.offers} highlightColor={data.offers > 0 ? "text-emerald-400" : undefined} />
        <MetricBlock label="Rejections" value={data.rejections} highlightColor={data.rejections > 0 ? "text-rose-400/90" : undefined} />
      </section>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
        {/* Left Column: Recent Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between h-7">
            <h2 className="text-lg font-medium leading-none">Recent Applications</h2>
            <Link
              href="/applications"
              className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors leading-none"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950/30">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider font-medium">
                <tr>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium hidden sm:table-cell">
                    Date
                  </th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {data.recentApps.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-zinc-500"
                    >
                      No applications yet. Press N to add one.
                    </td>
                  </tr>
                ) : (
                  data.recentApps.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-zinc-900/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/applications/${app.slug}`}
                          className="font-medium text-zinc-200 group-hover:text-white transition-colors flex items-center gap-3"
                        >
                          <CompanyLogo
                            name={app.companyName}
                            url={app.applicationUrl}
                          />
                          {app.companyName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {app.roleTitle}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 hidden sm:table-cell">
                        {app.dateApplied
                          ? format(new Date(app.dateApplied), "MMM d")
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Triage Insights & Action Items */}
        <div className="space-y-10">
          {/* Triage Insights */}
          <div className="space-y-4">
            <div className="flex items-center justify-between h-7">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium leading-none">Triage</h2>
                {data.triageStats.total > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {data.triageStats.total}
                  </span>
                )}
              </div>
              <Link
                href="/triage"
                className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors leading-none"
              >
                Review all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950/30 divide-y divide-zinc-900/60">
              {data.triageStats.missingContacts > 0 && (
                <Link
                  href="/triage"
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                      No Recruiter Contact
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">
                      {data.triageStats.missingContacts}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </Link>
              )}
              {data.triageStats.drafts > 0 && (
                <Link
                  href="/triage"
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-xs font-medium text-red-300 group-hover:text-white transition-colors">
                      Unfinished Drafts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-red-400">
                      {data.triageStats.drafts}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </Link>
              )}
              {data.triageStats.missingLinks > 0 && (
                <Link
                  href="/triage"
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-medium text-amber-300 group-hover:text-white transition-colors">
                      Missing Job Links
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-400">
                      {data.triageStats.missingLinks}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </Link>
              )}
              {data.triageStats.missingDates > 0 && (
                <Link
                  href="/triage"
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-xs font-medium text-blue-300 group-hover:text-white transition-colors">
                      Missing Applied Date
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-400">
                      {data.triageStats.missingDates}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </Link>
              )}
              {data.triageStats.total === 0 && (
                <div className="p-4 text-center text-xs text-zinc-500">
                  All applications complete & formatted.
                </div>
              )}
            </div>
          </div>

          {/* Action Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between h-7">
              <h2 className="text-lg font-medium leading-none">Action Items</h2>
              <Link
                href="/follow-ups"
                className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors leading-none"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {data.followUps.length === 0 ? (
                <div className="p-6 border border-zinc-900 rounded-lg bg-zinc-950/30 text-center">
                  <p className="text-zinc-500 text-sm">
                    You&apos;re all caught up. No follow-ups due.
                  </p>
                </div>
              ) : (
                data.followUps.map((app) => {
                  if (!app.nextFollowUpDate) return null;
                  const date = new Date(app.nextFollowUpDate);
                  const isDueToday = isToday(date);
                  const isOverdue = isPast(date) && !isDueToday;

                  return (
                    <div
                      key={app.id}
                      className="p-4 border border-zinc-900 rounded-lg hover:border-zinc-700 transition-colors bg-zinc-950/30 group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          href={`/applications/${app.slug}`}
                          className="font-medium text-sm text-zinc-200 group-hover:text-white transition-colors"
                        >
                          {app.companyName}
                        </Link>
                        <span
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border",
                            isOverdue
                              ? "text-red-400 border-red-400/20 bg-red-400/10"
                              : isDueToday
                                ? "text-amber-400 border-amber-400/20 bg-amber-400/10"
                                : "text-zinc-400 border-zinc-800 bg-zinc-900/50",
                          )}
                        >
                          {isOverdue
                            ? "Overdue"
                            : isDueToday
                              ? "Today"
                              : format(date, "MMM d")}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-3">
                        {app.roleTitle}
                      </p>

                      <div className="flex items-center gap-2">
                        <button className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors">
                          <Clock className="w-3 h-3" /> Mark as done
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
