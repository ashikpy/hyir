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
  actionRequired: boolean;
  suggestedAction?: string | null;
  originalSubject: string;
  originalDate: Date;
}

/**
 * Normalizes common email company domains
 * e.g. "notifications@greenhouse.io" or "recruiting@stripe.com" -> "Stripe"
 */
function extractCompanyFromEmail(fromEmail: string, subject: string): string {
  // Check subject line patterns like "Application for Software Engineer at Figma" or "Linear: Interview Invitation"
  const atMatch = subject.match(/(?:at|with|@)\s+([A-Z][A-Za-z0-9\s&.-]{1,30})/i);
  if (atMatch && atMatch[1]) {
    return atMatch[1].trim();
  }

  const prefixMatch = subject.match(/^([A-Z][A-Za-z0-9\s&.-]{1,25})\s*[:\-|–]/);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1].trim();
  }

  const domain = fromEmail.split("@")[1] || "";
  const domainBase = domain.split(".")[0];

  const commonATS = ["greenhouse", "lever", "workday", "ashby", "smartrecruiters", "breezy", "jobvite", "workable"];
  if (commonATS.includes(domainBase.toLowerCase())) {
    // Try extract from subject
    const subjWords = subject.split(/\s+/);
    return subjWords[0] || "Company";
  }

  if (domainBase) {
    return domainBase.charAt(0).toUpperCase() + domainBase.slice(1);
  }

  return "Company";
}

/**
 * Heuristic fallback parser when AI API key is unavailable
 */
export function heuristicParseEmail(email: RawJobEmail): ParsedJobUpdate {
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
    summary = `Formal offer or offer letter received from ${company}.`;
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
    text.includes("interview") ||
    text.includes("schedule a call") ||
    text.includes("invitation to interview") ||
    text.includes("screening call") ||
    text.includes("chat with our team") ||
    text.includes("availability for a call") ||
    text.includes("calendly.com") ||
    text.includes("google meet")
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

  const isJobRelated = detectedStatus !== null || text.includes("application") || text.includes("candidate");

  return {
    messageId: email.id,
    threadId: email.threadId,
    isJobRelated,
    companyName: company,
    roleTitle: null,
    detectedStatus,
    confidence,
    summary: summary || `Correspondence regarding application at ${company}.`,
    interviewDateTime: null,
    recruiterName: email.fromName || null,
    recruiterEmail: email.fromEmail || null,
    actionRequired,
    suggestedAction,
    originalSubject: email.subject,
    originalDate: email.date,
  };
}

/**
 * AI-powered email parser using Gemini 2.0 Flash with structured JSON output
 */
export async function parseJobEmailWithAI(email: RawJobEmail): Promise<ParsedJobUpdate> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  // If no Gemini key is provided, use high-precision heuristic fallback
  if (!apiKey) {
    return heuristicParseEmail(email);
  }

  try {
    const prompt = `You are a recruitment and career AI assistant. Analyze this email received by a job seeker and extract structured information about the job application status.

Email Details:
- Date: ${email.date.toISOString()}
- From: ${email.fromName} <${email.fromEmail}>
- Subject: ${email.subject}
- Snippet: ${email.snippet}
- Body Text:
"""
${email.body.slice(0, 2500)}
"""

Classify status strictly into one of:
- "APPLIED" (confirmation that application was submitted/received)
- "SCREENING" (recruiter phone screen or introductory chat)
- "INTERVIEW" (technical, behavioral, hiring manager, or onsite interview)
- "OFFER" (job offer extended or compensation discussion)
- "REJECTED" (rejection, not moving forward, or position cancelled)
- null (if not job application related or general newsletter/marketing)

Return ONLY valid JSON with this exact structure:
{
  "isJobRelated": true,
  "companyName": "Company Name",
  "roleTitle": "Role / Position Name or null",
  "detectedStatus": "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | null,
  "confidence": 0.95,
  "summary": "1 concise sentence summarizing the email",
  "interviewDateTime": "ISO string (e.g. 2026-09-05T15:00:00Z) if an interview date/time is mentioned, else null",
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
      console.warn("Gemini API error, falling back to heuristic:", res.statusText);
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

    return {
      messageId: email.id,
      threadId: email.threadId,
      isJobRelated: Boolean(parsed.isJobRelated),
      companyName: parsed.companyName || extractCompanyFromEmail(email.fromEmail, email.subject),
      roleTitle: parsed.roleTitle || null,
      detectedStatus: mappedStatus,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
      summary: parsed.summary || `Update from ${parsed.companyName || email.fromName}`,
      interviewDateTime: parsed.interviewDateTime || null,
      recruiterName: parsed.recruiterName || email.fromName || null,
      recruiterEmail: parsed.recruiterEmail || email.fromEmail || null,
      actionRequired: Boolean(parsed.actionRequired),
      suggestedAction: parsed.suggestedAction || null,
      originalSubject: email.subject,
      originalDate: email.date,
    };
  } catch (err) {
    console.error("Error in parseJobEmailWithAI, falling back to heuristic:", err);
    return heuristicParseEmail(email);
  }
}
