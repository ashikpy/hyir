"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Briefcase,
  GraduationCap,
  FileCode2,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  User,
  Mail,
  FileText,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createApplication } from "@/app/actions";
import { CompanyLogo } from "@/components/ui/avatars";
import { LocationInput } from "@/components/ui/location-input";
import { RoleInput } from "@/components/ui/role-input";

const STATUS_OPTIONS = [
  {
    value: "APPLIED",
    label: "Applied",
    activeClass:
      "bg-blue-500/20 text-blue-300 border-blue-500/60 ring-1 ring-blue-500/30",
    idleClass:
      "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-blue-500/40 hover:text-blue-300",
    dotColor: "bg-blue-400",
  },
  {
    value: "CONTACTED",
    label: "Contacted",
    activeClass:
      "bg-purple-500/20 text-purple-300 border-purple-500/60 ring-1 ring-purple-500/30",
    idleClass:
      "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-purple-500/40 hover:text-purple-300",
    dotColor: "bg-purple-400",
  },
  {
    value: "INTERVIEW",
    label: "Interview",
    activeClass:
      "bg-orange-500/20 text-orange-300 border-orange-500/60 ring-1 ring-orange-500/30",
    idleClass:
      "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-orange-500/40 hover:text-orange-300",
    dotColor: "bg-orange-400",
  },
  {
    value: "OFFER",
    label: "Offer",
    activeClass:
      "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30",
    idleClass:
      "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300",
    dotColor: "bg-emerald-400",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    activeClass:
      "bg-rose-500/20 text-rose-300 border-rose-500/60 ring-1 ring-rose-500/30",
    idleClass:
      "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-rose-500/40 hover:text-rose-300",
    dotColor: "bg-rose-400",
  },
  {
    value: "GHOSTED",
    label: "Ghosted",
    activeClass:
      "bg-zinc-800/80 text-zinc-300 border-zinc-700 ring-1 ring-zinc-600/30",
    idleClass:
      "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300",
    dotColor: "bg-zinc-500",
  },
];

const JOB_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full Time", icon: Briefcase },
  { value: "INTERNSHIP", label: "Intern", icon: GraduationCap },
  { value: "CONTRACT", label: "Contract", icon: FileCode2 },
];

const WORKPLACE_OPTIONS = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "Onsite" },
];

export function StatusPill({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { bg: string; text: string; border: string; dot: string }
  > = {
    SAVED: {
      bg: "bg-zinc-900",
      text: "text-zinc-300",
      border: "border-zinc-800",
      dot: "bg-zinc-400",
    },
    APPLIED: {
      bg: "bg-blue-950/50",
      text: "text-blue-300",
      border: "border-blue-500/30",
      dot: "bg-blue-400",
    },
    CONTACTED: {
      bg: "bg-purple-950/50",
      text: "text-purple-300",
      border: "border-purple-500/30",
      dot: "bg-purple-400",
    },
    INTERVIEW: {
      bg: "bg-orange-950/50",
      text: "text-orange-300",
      border: "border-orange-500/30",
      dot: "bg-orange-400",
    },
    OFFER: {
      bg: "bg-emerald-950/50",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
      dot: "bg-emerald-400",
    },
    REJECTED: {
      bg: "bg-red-950/50",
      text: "text-red-300",
      border: "border-red-500/30",
      dot: "bg-red-400",
    },
    GHOSTED: {
      bg: "bg-zinc-900/80",
      text: "text-zinc-400",
      border: "border-zinc-800",
      dot: "bg-zinc-500",
    },
  };
  const config = statusConfig[status] || statusConfig.SAVED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 border rounded-full ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status.replace("_", " ")}
    </span>
  );
}

export default function NewApplicationPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, setIsPending] = useState(false);

  // Step 1 State
  const [applicationUrl, setApplicationUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [status, setStatus] = useState("APPLIED");
  const [step1Error, setStep1Error] = useState("");

  // Step 2 State
  const [jobType, setJobType] = useState("FULL_TIME");
  const [workplaceType, setWorkplaceType] = useState("REMOTE");
  const [location, setLocation] = useState("");
  const [dateApplied, setDateApplied] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [salary, setSalary] = useState("");
  const [contactName, setContactName] = useState("");

  // Step 2 Optional details toggle
  const [showMoreOptional, setShowMoreOptional] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  function handleUrlChange(url: string) {
    setApplicationUrl(url);
    setStep1Error("");
    if (!companyName && url) {
      try {
        const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
        const hostname = parsed.hostname.replace(/^www\./, "");
        const parts = hostname.split(".");

        let detected = "";
        if (
          hostname.includes("greenhouse.io") ||
          hostname.includes("lever.co") ||
          hostname.includes("ashbyhq.com") ||
          hostname.includes("workday.com")
        ) {
          const pathParts = parsed.pathname.split("/").filter(Boolean);
          if (pathParts.length > 0) detected = pathParts[0];
        } else if (parts.length >= 2) {
          detected = parts[0];
        }

        if (
          detected &&
          detected !== "careers" &&
          detected !== "jobs" &&
          detected !== "boards"
        ) {
          setCompanyName(
            detected.charAt(0).toUpperCase() + detected.slice(1).toLowerCase(),
          );
        }
      } catch {
        // ignore
      }
    }
  }

  function handleProceedToStep2() {
    if (!applicationUrl.trim()) {
      setStep1Error(
        "Job Post / Career Link is mandatory. Please provide a link.",
      );
      return;
    }
    if (!companyName.trim()) {
      setStep1Error("Company Name is required.");
      return;
    }
    if (!roleTitle.trim()) {
      setStep1Error("Role Title is required.");
      return;
    }
    setStep1Error("");
    setStep(2);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (step === 1) {
          handleProceedToStep2();
        } else {
          formRef.current?.requestSubmit();
        }
      }
      if (e.key === "Escape" && e.target === document.body) {
        router.push("/applications");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, applicationUrl, companyName, roleTitle, router]);

  async function handleSubmit(formData: FormData) {
    if (!applicationUrl.trim() || !companyName.trim() || !roleTitle.trim()) {
      alert("Please fill all mandatory fields.");
      return;
    }
    setIsPending(true);
    try {
      formData.set("status", status);
      formData.set("companyName", companyName);
      formData.set("roleTitle", roleTitle);
      formData.set("applicationUrl", applicationUrl);
      formData.set("jobType", jobType);
      formData.set("workplaceType", workplaceType);
      if (dateApplied) formData.set("dateApplied", dateApplied);

      const slug = await createApplication(formData);
      router.push(slug ? `/applications/${slug}` : "/applications");
    } catch (e) {
      console.error(e);
      alert("Failed to save application.");
      setIsPending(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Top Nav & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/applications"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to applications</span>
        </Link>

        {/* Step Pill */}
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full text-xs text-zinc-400">
          <span
            className={`w-2 h-2 rounded-full ${step === 1 ? "bg-blue-400" : "bg-emerald-400"}`}
          />
          <span>Step {step} of 2</span>
        </div>
      </div>

      {/* ================= STEP 1 ================= */}
      {step === 1 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950/70 border border-zinc-900 shadow-2xl space-y-7 animate-in fade-in duration-200">
          {/* Header */}
          <div className="space-y-1 pb-4 border-b border-zinc-900">
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
              Track New Application
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-normal">
              Provide the job link and core role info to get started.
            </p>
          </div>

          {step1Error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 font-medium">
              {step1Error}
            </div>
          )}

          <div className="space-y-6">
            {/* 1. Job Link (Mandatory) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-zinc-300">
                  Job Post / Career Link <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-zinc-500">Mandatory</span>
              </div>
              <div className="relative group">
                <input
                  type="url"
                  required
                  autoFocus
                  value={applicationUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://company.com/careers/role or job post link"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-3.5 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {applicationUrl ? (
                    <CompanyLogo
                      name={companyName || "Logo"}
                      url={applicationUrl}
                      className="w-5 h-5 rounded"
                    />
                  ) : (
                    <LinkIcon className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
              </div>
            </div>

            {/* 2. Company & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="companyName"
                  required
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setStep1Error("");
                  }}
                  placeholder="e.g. Linear, Figma, Stripe"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Role Title <span className="text-red-400">*</span>
                </label>
                <RoleInput
                  name="roleTitle"
                  required
                  defaultValue={roleTitle}
                  onChange={(val) => {
                    setRoleTitle(val);
                    setStep1Error("");
                  }}
                  placeholder="e.g. Product Designer, Founding Engineer"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-3.5 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            {/* 3. Stage Selector */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-zinc-900">
              <label className="block text-xs font-medium text-zinc-300">
                Initial Pipeline Stage <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected ? opt.activeClass : opt.idleClass
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${opt.dotColor} ${
                          isSelected ? "animate-pulse" : "opacity-60"
                        }`}
                      />
                      <span>{opt.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 ml-0.5 opacity-90" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-zinc-900 flex items-center justify-end">
            <button
              type="button"
              onClick={handleProceedToStep2}
              className="inline-flex items-center gap-2 text-xs font-semibold text-black bg-zinc-100 hover:bg-white px-6 py-3 rounded-xl transition-all shadow-md shadow-black/40 cursor-pointer"
            >
              <span>Continue to details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2 ================= */}
      {step === 2 && (
        <form
          ref={formRef}
          action={handleSubmit}
          className="p-6 sm:p-8 rounded-2xl bg-zinc-950/70 border border-zinc-900 shadow-2xl space-y-7 animate-in fade-in duration-200"
        >
          {/* Company Brand Header at Top of Step 2 */}
          <div className="flex items-center justify-between gap-6 pb-6 border-b border-zinc-900">
            <div className="flex items-center gap-4 min-w-0">
              <CompanyLogo
                name={companyName}
                url={applicationUrl}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0"
              />
              <div className="truncate">
                <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white truncate">
                  {companyName}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-zinc-400 truncate mt-0.5">
                  {roleTitle}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
              >
                Edit core info
              </button>
              <StatusPill status={status} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-2">
              <h3 className="text-sm font-medium text-zinc-200">
                Application & Location Details
              </h3>
              <p className="text-xs text-zinc-500">
                Configure mandatory job specifications
              </p>
            </div>

            {/* Mandatory Job Type, Workplace & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Job Type (Mandatory) */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Job Type <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center p-1 rounded-xl bg-zinc-900/80 border border-zinc-800 h-[42px]">
                  {JOB_TYPE_OPTIONS.map((opt) => {
                    const isSelected = jobType === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setJobType(opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-full rounded-lg text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white text-black font-semibold shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 font-medium"
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-black" : "text-zinc-500"}`}
                        />
                        <span className="whitespace-nowrap">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workplace Type (Mandatory) */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Workplace Type <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={workplaceType}
                    onChange={(e) => setWorkplaceType(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 cursor-pointer appearance-none pr-9"
                  >
                    {WORKPLACE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-100">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Location (Mandatory) */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Location <span className="text-red-400">*</span>
                </label>
                <LocationInput
                  name="location"
                  defaultValue={location}
                  placeholder="e.g. Remote, San Francisco, Bangalore"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-3 pl-8 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              {/* Date Applied (Mandatory) */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Date Applied <span className="text-red-400">*</span>
                </label>
                <input
                  name="dateApplied"
                  type="date"
                  value={dateApplied}
                  onChange={(e) => setDateApplied(e.target.value)}
                  required
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            {/* Optional Details Collapsible Section */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMoreOptional(!showMoreOptional)}
                className="w-full flex items-center justify-between p-4 pr-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <span>Optional Details (Salary, Contact Recruiter, Notes)</span>
                {showMoreOptional ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showMoreOptional && (
                <div className="pt-5 space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Target Salary (Optional) */}
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs font-medium text-zinc-300">
                        Target Salary
                      </label>
                      <div className="relative">
                        <input
                          name="salary"
                          type="text"
                          value={salary}
                          onChange={(e) => setSalary(e.target.value)}
                          placeholder="e.g. $140k - $170k or ₹25 LPA"
                          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-3.5 pr-28 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSalary(
                              salary === "Not Disclosed" ? "" : "Not Disclosed",
                            )
                          }
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] font-medium px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            salary === "Not Disclosed"
                              ? "bg-zinc-800 text-zinc-100 border-zinc-600"
                              : "bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-zinc-200 hover:border-zinc-600"
                          }`}
                        >
                          {salary === "Not Disclosed"
                            ? "✓ Not Disclosed"
                            : "Not Disclosed"}
                        </button>
                      </div>
                    </div>

                    {/* Job Description URL (Optional) */}
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs font-medium text-zinc-300">
                        Job Description Link
                      </label>
                      <input
                        name="jobDescriptionUrl"
                        type="url"
                        placeholder="https://..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>

                    {/* Contact Name (Optional) */}
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs font-medium text-zinc-300">
                        Recruiter Name
                      </label>
                      <div className="relative">
                        <input
                          name="contactName"
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-3.5 pr-32 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setContactName(
                              contactName === "No Direct Contact"
                                ? ""
                                : "No Direct Contact",
                            )
                          }
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] font-medium px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            contactName === "No Direct Contact"
                              ? "bg-zinc-800 text-zinc-100 border-zinc-600"
                              : "bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-zinc-200 hover:border-zinc-600"
                          }`}
                        >
                          {contactName === "No Direct Contact"
                            ? "✓ No Contact"
                            : "No Contact"}
                        </button>
                      </div>
                    </div>

                    {/* Contact Email (Optional) */}
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs font-medium text-zinc-300">
                        Recruiter Email
                      </label>
                      <input
                        name="contactEmail"
                        type="email"
                        placeholder="e.g. sarah@company.com"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Notes & Strategy (Optional) */}
                  <div className="flex flex-col gap-2">
                    <label className="block text-xs font-medium text-zinc-300">
                      Notes & Strategy
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Recruiter talking points, portfolio version used, or notes..."
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 Actions */}
            <div className="pt-6 border-t border-zinc-900 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 text-xs font-semibold text-black bg-zinc-100 hover:bg-white px-6 py-3 rounded-xl transition-all shadow-md shadow-black/40 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Saving..." : "Save Application"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Keyboard Shortcut Hint */}
      <div className="text-center pt-8">
        <span className="text-xs text-zinc-600">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 mx-1 font-mono">
            ⌘ + ↵
          </kbd>{" "}
          {step === 1 ? "to continue" : "to save"}
        </span>
      </div>
    </div>
  );
}
