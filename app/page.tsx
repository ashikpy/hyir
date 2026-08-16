import prisma from "@/lib/prisma";
import Link from "next/link";

async function getJobsCount() {
  try {
    const count = await prisma.job.count();
    return { count, connected: true };
  } catch (error) {
    return { count: 0, connected: false };
  }
}

export default async function Home() {
  const dbStatus = await getJobsCount();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              J
            </div>
            <span className="font-bold text-xl tracking-tight text-white">JobHunt</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-medium border border-slate-700/50">
              Prisma + Vercel
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <a
              href="https://console.prisma.io"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Prisma Console
            </a>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Vercel Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <section className="text-center space-y-6 max-w-3xl mx-auto pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dbStatus.connected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dbStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            {dbStatus.connected ? "Prisma Database Connected" : "Prisma Schema Configured"}
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Production-Ready <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Prisma + Vercel Setup
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Your full-stack job application platform is configured with Prisma ORM, PostgreSQL schema models (User, Company, Job, Application), singleton database connection, and Vercel build automation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="/api/jobs"
              target="_blank"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <span>Test API Endpoint</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 font-semibold text-slate-200 border border-slate-800 transition-all"
            >
              Deploy to Vercel
            </a>
          </div>
        </section>

        {/* Database Status Card */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Database Status</div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-xl font-bold text-white">
                {dbStatus.connected ? "Connected" : "Pending Connection"}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {dbStatus.connected
                ? `Prisma Client successfully queried ${dbStatus.count} job listings in PostgreSQL.`
                : "Set DATABASE_URL in .env to connect your Prisma Postgres / PostgreSQL instance."}
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prisma ORM</div>
            <div className="text-xl font-bold text-white flex items-center justify-between">
              <span>Client v6.4.1</span>
              <span className="text-xs px-2 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-md font-mono">
                postgresql
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Singleton client configured in <code className="text-indigo-300 font-mono text-xs">lib/prisma.ts</code> for HMR safety.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vercel Build Integration</div>
            <div className="text-xl font-bold text-white flex items-center justify-between">
              <span>Postinstall Hook</span>
              <span className="text-xs px-2 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-md font-mono">
                Automated
              </span>
            </div>
            <p className="text-sm text-slate-400">
              <code className="text-emerald-300 font-mono text-xs">prisma generate</code> runs automatically during Vercel deployment builds.
            </p>
          </div>
        </section>

        {/* Setup Steps & Commands */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Next Steps for Prisma & Vercel Hosting</h2>
            <p className="text-slate-400">Follow these standard commands to sync your database and deploy live.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-indigo-400 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs">1</span>
                Connect Database & Push Schema
              </h3>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
                <p className="text-slate-500"># 1. Add your connection string in .env</p>
                <p className="text-indigo-300">DATABASE_URL="postgresql://user:password@host:5432/db"</p>
                <p className="text-slate-500 pt-2"># 2. Push schema models to database</p>
                <p className="text-emerald-400">bunx prisma db push</p>
                <p className="text-slate-500 pt-2"># 3. Launch database UI studio</p>
                <p className="text-emerald-400">bunx prisma studio</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold text-indigo-400 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs">2</span>
                Deploy to Vercel
              </h3>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
                <p className="text-slate-500"># 1. Commit and push changes to GitHub</p>
                <p className="text-emerald-400">git add . && git commit -m "Setup Prisma & Vercel setup"</p>
                <p className="text-slate-500 pt-2"># 2. Import project into Vercel Dashboard</p>
                <p className="text-indigo-300">Add DATABASE_URL to Vercel Environment Variables</p>
                <p className="text-slate-500 pt-2"># 3. Build & Deploy happens automatically!</p>
                <p className="text-emerald-400">vercel --prod</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
