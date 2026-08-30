import { RawJobEmail } from "@/lib/gmail";
import { ApplicationStatus } from "@prisma/client";

export interface ParsedJobUpdate {
  messageId: string;
  threadId: string;
  isJobRelated: boolean;
  companyName: string;
  roleTitle?: string | null;
  detectedStatus: ApplicationStatus | null;
  confidence: number;
  summary: string;
  interviewDateTime?: string | null; // ISO string if meeting detected
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  sourcePlatform?: string | null;
  actionRequired: boolean;
  suggestedAction?: string | null;
  originalSubject: string;
  originalDate: Date;
  emailSnippet?: string;
  emailBody?: string;
}

export const BROKER_DOMAINS = [
  "instahyre.com",
  "wellfound.com",
  "angel.co",
  "otta.com",
  "ottacareers.com",
  "naukri.com",
  "hirist.com",
  "foundit.in",
  "cutshort.io",
  "ycombinator.com",
  "topstartups.io",
  "greenhouse.io",
  "greenhouse-mail.io",
  "lever.co",
  "ashbyhq.com",
  "workday.com",
  "smartrecruiters.com",
  "breezy.hr",
  "jobvite.com",
  "workable.com",
  "linkedin.com",
  "unstop.com",
  "cuvette.tech",
  "internshala.com",
];

export function isBrokerOrProxyEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  const domain = lower.split("@")[1] || "";

  if (BROKER_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return true;
  }

  if (
    lower.startsWith("no-reply@") ||
    lower.startsWith("noreply@") ||
    lower.startsWith("notifications@") ||
    lower.startsWith("notification@") ||
    lower.startsWith("alerts@") ||
    lower.startsWith("mailer@") ||
    lower.startsWith("system@") ||
    lower.startsWith("talent@") ||
    lower.startsWith("updates@") ||
    lower.startsWith("invitations@")
  ) {
    return true;
  }

  return false;
}

export function detectBrokerPlatform(fromEmail: string, fromName: string, subject: string): string | null {
  const combined = `${fromEmail} ${fromName} ${subject}`.toLowerCase();
  if (combined.includes("instahyre")) return "Instahyre";
  if (combined.includes("wellfound") || combined.includes("angel.co")) return "Wellfound";
  if (combined.includes("otta")) return "Otta";
  if (combined.includes("hirist")) return "Hirist";
  if (combined.includes("naukri")) return "Naukri";
  if (combined.includes("cutshort")) return "Cutshort";
  if (combined.includes("cuvette")) return "Cuvette";
  if (combined.includes("internshala")) return "Internshala";
  if (combined.includes("greenhouse")) return "Greenhouse";
  if (combined.includes("lever")) return "Lever";
  if (combined.includes("ashby")) return "Ashby";
  if (combined.includes("workday")) return "Workday";
  if (combined.includes("linkedin")) return "LinkedIn";
  return null;
}

const IGNORED_DOMAINS = [
  "redditmail.com",
  "reddit.com",
  "quora.com",
  "medium.com",
  "youtube.com",
  "facebookmail.com",
  "twitter.com",
  "x.com",
  "github.com",
  "slack.com",
  "discord.com",
];

const IGNORED_SENDERS = [
  "invitations@linkedin.com",
  "updates@linkedin.com",
  "notifications@linkedin.com",
  "messages-noreply@linkedin.com",
  "jobalerts-noreply@linkedin.com",
  "calendar-notification@google.com",
  "no-reply@accounts.google.com",
];

function isIgnoredEmail(fromEmail: string, subject: string): boolean {
  const fromLower = fromEmail.toLowerCase();
  const subjLower = subject.toLowerCase();

  // Ignored senders / newsletters
  if (IGNORED_SENDERS.some((s) => fromLower.includes(s))) return true;
  if (IGNORED_DOMAINS.some((d) => fromLower.includes(`@${d}`) || fromLower.includes(`.${d}`))) return true;

  // Social networking / non-job outreach
  if (subjLower.includes("accepted your invitation") || subjLower.includes("explore their network") || subjLower.includes("view connections")) {
    return true;
  }

  // Job alert marketing / newsletters / promotional broadcasts (e.g. Unstop "Your Target Role is Waiting!", LinkedIn Alerts)
  if (
    subjLower.includes("target role is waiting") ||
    subjLower.includes("jobs you may be") ||
    subjLower.includes("top job picks") ||
    subjLower.includes("job recommendations") ||
    subjLower.includes("new jobs matching") ||
    subjLower.includes("daily job alert") ||
    subjLower.includes("weekly job alert") ||
    subjLower.includes("recommended jobs") ||
    subjLower.includes("handpicked jobs") ||
    subjLower.includes("digest") ||
    subjLower.includes("newsletter")
  ) {
    return true;
  }

  // Generic automated system newsletters
  if (subjLower.includes("security alert") || subjLower.includes("verification code") || subjLower.includes("password reset")) {
    return true;
  }

  return false;
}

/**
 * Normalizes common email company domains
 */
function extractCompanyFromEmail(fromEmail: string, subject: string): string {
  // Check subject line patterns like "Application for Software Engineer at Figma" or "Linear: Interview Invitation"
  const atMatch = subject.match(/(?:at|with|@)\s+([A-Z][A-Za-z0-9\s&.-]{1,30})/i);
  if (atMatch && atMatch[1]) {
    const candidate = atMatch[1].trim();
    if (!candidate.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d+)/i)) {
      return candidate;
    }
  }

  const prefixMatch = subject.match(/^([A-Z][A-Za-z0-9\s&.-]{1,25})\s*[:\-|–]/);
  if (prefixMatch && prefixMatch[1]) {
    const candidate = prefixMatch[1].trim();
    if (!candidate.match(/^(Invitation|Reminder|Update|Alert|Notice|Fwd|Re|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i)) {
      return candidate;
    }
  }

  const domain = fromEmail.split("@")[1] || "";
  const domainBase = domain.split(".")[0];

  const commonATS = ["greenhouse", "lever", "workday", "ashby", "smartrecruiters", "breezy", "jobvite", "workable", "naukri"];
  if (commonATS.includes(domainBase.toLowerCase())) {
    return "Company";
  }

  if (domainBase && domainBase.length > 2) {
    return domainBase.charAt(0).toUpperCase() + domainBase.slice(1);
  }

  return "Company";
}

/**
 * Heuristic fallback parser when AI API key is unavailable
 */
export function heuristicParseEmail(email: RawJobEmail): ParsedJobUpdate {
  if (isIgnoredEmail(email.fromEmail, email.subject)) {
    return {
      messageId: email.id,
      threadId: email.threadId,
      isJobRelated: false,
      companyName: "",
      roleTitle: null,
      detectedStatus: null,
      confidence: 0,
      summary: "",
      interviewDateTime: null,
      recruiterName: null,
      recruiterEmail: null,
      actionRequired: false,
      suggestedAction: null,
      originalSubject: email.subject,
      originalDate: email.date,
    };
  }

  const text = `${email.subject} ${email.snippet} ${email.body}`.toLowerCase();
  const company = extractCompanyFromEmail(email.fromEmail, email.subject);

  let detectedStatus: ApplicationStatus | null = null;
  let summary = "";
  let actionRequired = false;
  let suggestedAction: string | null = null;
  let confidence = 0.7;

  // 1. Offer
  if (
    text.includes("offer of employment") ||
    text.includes("pleased to offer") ||
    text.includes("congratulations on your offer") ||
    text.includes("formal offer")
  ) {
    detectedStatus = ApplicationStatus.OFFER;
    summary = `Formal offer received from ${company}.`;
    actionRequired = true;
    suggestedAction = "Review offer details & compensation.";
    confidence = 0.9;
  }
  // 2. Rejection
  else if (
    text.includes("unfortunately") ||
    text.includes("moving forward with other candidates") ||
    text.includes("decided not to move forward") ||
    text.includes("not be moving forward") ||
    text.includes("pursue other applicants") ||
    text.includes("position has been filled")
  ) {
    detectedStatus = ApplicationStatus.REJECTED;
    summary = `${company} shared an update that they are not moving forward.`;
    confidence = 0.85;
  }
  // 3. Interview / Next steps
  else if (
    (text.includes("interview") ||
      text.includes("schedule a call") ||
      text.includes("invitation to interview") ||
      text.includes("screening call") ||
      text.includes("chat with our team") ||
      text.includes("availability for a call")) &&
    !text.includes("onboarding call")
  ) {
    detectedStatus = ApplicationStatus.INTERVIEW;
    summary = `${company} reached out regarding an interview or screening round.`;
    actionRequired = true;
    suggestedAction = "Schedule interview or confirm availability.";
    confidence = 0.85;
  }
  // 4. Application received
  else if (
    text.includes("thank you for applying") ||
    text.includes("application received") ||
    text.includes("received your application") ||
    text.includes("we have received your resume")
  ) {
    detectedStatus = ApplicationStatus.APPLIED;
    summary = `Confirmation that application was received at ${company}.`;
    confidence = 0.8;
  }

  const isJobRelated = detectedStatus !== null && company !== "Company" && !company.match(/^(Tue|Mon|Wed|Thu|Fri|Sat|Sun)/i);
  const brokerPlatform = detectBrokerPlatform(email.fromEmail, email.fromName, email.subject);

  let cleanRecruiterEmail: string | null = null;
  if (email.fromEmail && !isBrokerOrProxyEmail(email.fromEmail)) {
    cleanRecruiterEmail = email.fromEmail;
  }
  let cleanRecruiterName: string | null = null;
  if (email.fromName && !isBrokerOrProxyEmail(email.fromEmail) && !email.fromName.toLowerCase().includes("notification") && !email.fromName.toLowerCase().includes("team")) {
    cleanRecruiterName = email.fromName;
  }

  return {
    messageId: email.id,
    threadId: email.threadId,
    isJobRelated,
    companyName: isJobRelated ? company : "",
    roleTitle: null,
    detectedStatus,
    confidence,
    summary: summary || `Correspondence regarding application at ${company}.`,
    interviewDateTime: null,
    recruiterName: cleanRecruiterName,
    recruiterEmail: cleanRecruiterEmail,
    fromName: email.fromName || null,
    fromEmail: email.fromEmail || null,
    sourcePlatform: brokerPlatform,
    actionRequired,
    suggestedAction,
    originalSubject: email.subject,
    originalDate: email.date,
    emailSnippet: email.snippet,
    emailBody: email.body,
  };
}

/**
 * AI-powered email parser using Gemini 2.0 Flash with structured JSON output
 */
export async function parseJobEmailWithAI(email: RawJobEmail): Promise<ParsedJobUpdate> {
  if (isIgnoredEmail(email.fromEmail, email.subject)) {
    return {
      messageId: email.id,
      threadId: email.threadId,
      isJobRelated: false,
      companyName: "",
      roleTitle: null,
      detectedStatus: null,
      confidence: 0,
      summary: "",
      interviewDateTime: null,
      recruiterName: null,
      recruiterEmail: null,
      actionRequired: false,
      suggestedAction: null,
      originalSubject: email.subject,
      originalDate: email.date,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return heuristicParseEmail(email);
  }

  try {
    const prompt = `You are a recruitment and career AI assistant. Analyze this email received by a job seeker.

Determine if this email is a legitimate individual job application update (e.g. from an employer, recruiter, or ATS like Greenhouse/Lever about a job application, screening, interview, offer, or rejection).
Ignore social media connection requests (e.g. LinkedIn connection accepted, Twitter/Reddit notifications), general job board marketing/digests (e.g. "Jobs you might like from Naukri/LinkedIn"), internal company onboarding, or newsletter spam.

Email Details:
- Date: ${email.date.toISOString()}
- From: ${email.fromName} <${email.fromEmail}>
- Subject: ${email.subject}
- Snippet: ${email.snippet}
- Body Text:
"""
${email.body.slice(0, 2500)}
"""

Return ONLY valid JSON with this exact structure:
{
  "isJobRelated": true | false,
  "companyName": "Actual Hiring Company Name (NOT 'LinkedIn', 'Reddit', 'Naukri', or dates)",
  "roleTitle": "Role / Position Name or null",
  "detectedStatus": "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | null,
  "confidence": 0.95,
  "summary": "1 concise sentence summarizing the email",
  "interviewDateTime": "ISO string if an interview date/time is mentioned, else null",
  "recruiterName": "Recruiter Name or null",
  "recruiterEmail": "Recruiter Email or null",
  "actionRequired": true | false,
  "suggestedAction": "e.g. Confirm 2pm interview on Google Calendar or null"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      }
    );

    if (!res.ok) {
      return heuristicParseEmail(email);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return heuristicParseEmail(email);
    }

    const parsed = JSON.parse(candidateText);

    let mappedStatus: ApplicationStatus | null = null;
    if (parsed.detectedStatus && Object.values(ApplicationStatus).includes(parsed.detectedStatus)) {
      mappedStatus = parsed.detectedStatus as ApplicationStatus;
    }

    const isValidCompany =
      parsed.companyName &&
      parsed.companyName !== "Company" &&
      !parsed.companyName.match(/^(Linkedin|Reddit|Naukri|Google|Youtube|Twitter|Tue|Mon|Wed|Thu|Fri|Sat|Sun)/i);

    const brokerPlatform = detectBrokerPlatform(email.fromEmail, email.fromName, email.subject);

    // Only set recruiter email if it's a real human direct email, NOT a broker or proxy
    let cleanRecruiterEmail: string | null = null;
    if (parsed.recruiterEmail && !isBrokerOrProxyEmail(parsed.recruiterEmail)) {
      cleanRecruiterEmail = parsed.recruiterEmail;
    } else if (email.fromEmail && !isBrokerOrProxyEmail(email.fromEmail)) {
      cleanRecruiterEmail = email.fromEmail;
    }

    let cleanRecruiterName: string | null = null;
    if (parsed.recruiterName && !parsed.recruiterName.toLowerCase().includes("notification") && !parsed.recruiterName.toLowerCase().includes("team")) {
      cleanRecruiterName = parsed.recruiterName;
    } else if (email.fromName && !isBrokerOrProxyEmail(email.fromEmail) && !email.fromName.toLowerCase().includes("notification") && !email.fromName.toLowerCase().includes("team")) {
      cleanRecruiterName = email.fromName;
    }

    return {
      messageId: email.id,
      threadId: email.threadId,
      isJobRelated: Boolean(parsed.isJobRelated && isValidCompany),
      companyName: isValidCompany ? parsed.companyName : "",
      roleTitle: parsed.roleTitle || null,
      detectedStatus: mappedStatus,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
      summary: parsed.summary || `Update from ${parsed.companyName || email.fromName}`,
      interviewDateTime: parsed.interviewDateTime || null,
      recruiterName: cleanRecruiterName,
      recruiterEmail: cleanRecruiterEmail,
      fromName: email.fromName || null,
      fromEmail: email.fromEmail || null,
      sourcePlatform: brokerPlatform,
      actionRequired: Boolean(parsed.actionRequired),
      suggestedAction: parsed.suggestedAction || null,
      originalSubject: email.subject,
      originalDate: email.date,
      emailSnippet: email.snippet,
      emailBody: email.body,
    };
  } catch (err) {
    console.error("Error in parseJobEmailWithAI, falling back to heuristic:", err);
    return heuristicParseEmail(email);
  }
}
