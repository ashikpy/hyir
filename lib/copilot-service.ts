import { prisma } from "@/lib/prisma";
import { ApplicationStatus, TimelineEventType, JobType, WorkplaceType } from "@prisma/client";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";
import { addDays, isPast, isToday, format } from "date-fns";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  action?: CopilotAction;
  suggestions?: string[];
}

export type CopilotAction =
  | {
      type: "APPLICATION_CREATED";
      app: {
        id: string;
        slug: string;
        companyName: string;
        roleTitle: string;
        status: ApplicationStatus;
        applicationUrl?: string | null;
        salary?: string | null;
        location?: string | null;
        source?: string | null;
      };
    }
  | {
      type: "APPLICATION_UPDATED";
      app: {
        id: string;
        slug: string;
        companyName: string;
        roleTitle: string;
        status: ApplicationStatus;
        applicationUrl?: string | null;
        salary?: string | null;
        location?: string | null;
      };
    }
  | {
      type: "STATUS_UPDATED";
      app: {
        id: string;
        slug: string;
        companyName: string;
        roleTitle: string;
        previousStatus: ApplicationStatus;
        newStatus: ApplicationStatus;
      };
    }
  | {
      type: "FOLLOW_UP_SCHEDULED";
      app: {
        id: string;
        slug: string;
        companyName: string;
        roleTitle: string;
        followUpDate: string;
        calendarUrl: string;
      };
    }
  | {
      type: "NOTE_ADDED";
      app: {
        id: string;
        slug: string;
        companyName: string;
        note: string;
      };
    }
  | {
      type: "EMAIL_DRAFTED";
      email: {
        recipientName?: string;
        recipientEmail?: string;
        companyName: string;
        subject: string;
        body: string;
        mailtoUrl: string;
        gmailUrl: string;
      };
    }
  | {
      type: "INTERVIEW_PREP";
      prep: {
        companyName: string;
        roleTitle: string;
        keyFocusAreas: string[];
        technicalQuestions: string[];
        behavioralQuestions: string[];
        questionsToAskInterviewer: string[];
        preparationTips: string[];
      };
    };

export interface ProcessCopilotRequestParams {
  userId: string;
  message: string;
  history?: CopilotMessage[];
  apiKey?: string;
}

export interface CopilotResponse {
  reply: string;
  action?: CopilotAction;
  suggestions: string[];
  providerUsed: "gemini" | "smart-local";
  model: string;
}

/**
 * Fetch a rich snapshot of the user's current pipeline
 */
export async function getPipelineContext(userId: string) {
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      timelineEvents: {
        take: 3,
        orderBy: { date: "desc" },
      },
    },
  });

  const total = applications.length;
  const statusCounts: Record<string, number> = {};
  const activeApps = applications.filter((a) =>
    ["APPLIED", "CONTACTED", "SCREENING", "INTERVIEW", "ASSIGNMENT"].includes(a.status)
  );

  for (const app of applications) {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
  }

  const overdueFollowUps = applications.filter((a) => {
    if (!a.nextFollowUpDate) return false;
    return (
      isPast(new Date(a.nextFollowUpDate)) &&
      !isToday(new Date(a.nextFollowUpDate)) &&
      !["REJECTED", "ACCEPTED", "WITHDRAWN", "GHOSTED"].includes(a.status)
    );
  });

  const todayFollowUps = applications.filter((a) => {
    if (!a.nextFollowUpDate) return false;
    return (
      isToday(new Date(a.nextFollowUpDate)) &&
      !["REJECTED", "ACCEPTED", "WITHDRAWN", "GHOSTED"].includes(a.status)
    );
  });

  const interviewStages = applications.filter((a) =>
    ["INTERVIEW", "SCREENING", "ASSIGNMENT"].includes(a.status)
  );

  const offers = applications.filter((a) => a.status === "OFFER" || a.status === "ACCEPTED");

  return {
    total,
    activeCount: activeApps.length,
    statusCounts,
    overdueFollowUps,
    todayFollowUps,
    interviewStages,
    offers,
    applications: applications.map((a) => ({
      id: a.id,
      slug: a.slug,
      companyName: a.companyName,
      roleTitle: a.roleTitle,
      status: a.status,
      salary: a.salary,
      source: a.source,
      location: a.location,
      dateApplied: a.dateApplied?.toISOString().split("T")[0] || null,
      nextFollowUpDate: a.nextFollowUpDate?.toISOString().split("T")[0] || null,
      contactName: a.contactName,
      contactEmail: a.contactEmail,
      notes: a.notes,
    })),
  };
}

/**
 * Find application by fuzzy company name or ID
 */
async function findApplication(userId: string, identifier: string) {
  const clean = identifier.trim().toLowerCase();
  
  // Try by exact ID or slug
  let app = await prisma.application.findFirst({
    where: {
      userId,
      OR: [{ id: identifier }, { slug: clean }],
    },
  });

  if (app) return app;

  // Try by company name
  const allUserApps = await prisma.application.findMany({
    where: { userId },
  });

  // Exact company match
  app = allUserApps.find((a) => a.companyName.toLowerCase() === clean) || null;
  if (app) return app;

  // Partial company match
  app = allUserApps.find((a) => a.companyName.toLowerCase().includes(clean) || clean.includes(a.companyName.toLowerCase())) || null;
  return app;
}

/**
 * Execute Application Status Change
 */
export async function executeUpdateStatus(
  userId: string,
  identifier: string,
  newStatus: ApplicationStatus
) {
  const app = await findApplication(userId, identifier);
  if (!app) {
    throw new Error(`Application "${identifier}" not found in your pipeline.`);
  }

  const previousStatus = app.status;

  const updated = await prisma.application.update({
    where: { id: app.id },
    data: {
      status: newStatus,
      timelineEvents: {
        create: {
          eventType: TimelineEventType.STATUS_CHANGE,
          description: `Copilot moved stage from ${previousStatus} to ${newStatus}`,
          date: new Date(),
        },
      },
    },
  });

  return {
    id: updated.id,
    slug: updated.slug,
    companyName: updated.companyName,
    roleTitle: updated.roleTitle,
    previousStatus,
    newStatus: updated.status,
  };
}

/**
 * Execute Application Creation
 */
export async function executeCreateApplication(
  userId: string,
  data: {
    companyName: string;
    roleTitle: string;
    status?: ApplicationStatus;
    applicationUrl?: string;
    salary?: string;
    location?: string;
    source?: string;
    notes?: string;
    nextFollowUpDays?: number;
  }
) {
  const { companyName, roleTitle, status = "APPLIED", applicationUrl, salary, location, source, notes, nextFollowUpDays } = data;

  if (!companyName || !roleTitle) {
    throw new Error("Company name and role title are required.");
  }

  const baseSlug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const existing = await prisma.application.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;

  const followUpDate = nextFollowUpDays ? addDays(new Date(), nextFollowUpDays) : null;

  let normalizedUrl = applicationUrl ? applicationUrl.trim() : null;
  if (normalizedUrl && !normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const created = await prisma.application.create({
    data: {
      userId,
      slug,
      companyName,
      roleTitle,
      status,
      applicationUrl: normalizedUrl,
      salary: salary || null,
      location: location || null,
      source: source || null,
      notes: notes || null,
      dateApplied: status !== "SAVED" ? new Date() : null,
      nextFollowUpDate: followUpDate,
      timelineEvents: {
        create: {
          eventType: TimelineEventType.STATUS_CHANGE,
          description: `Tracked via Hyir Copilot (${status})`,
          date: new Date(),
        },
      },
    },
  });

  return {
    id: created.id,
    slug: created.slug,
    companyName: created.companyName,
    roleTitle: created.roleTitle,
    status: created.status,
    applicationUrl: created.applicationUrl,
    salary: created.salary,
    location: created.location,
    source: created.source,
  };
}

/**
 * Execute Application Details Update
 */
export async function executeUpdateApplicationDetails(
  userId: string,
  identifier: string,
  updates: {
    applicationUrl?: string;
    salary?: string;
    location?: string;
    roleTitle?: string;
    notes?: string;
  }
) {
  const app = await findApplication(userId, identifier);
  if (!app) {
    throw new Error(`Application "${identifier}" not found in your pipeline.`);
  }

  let normalizedUrl = updates.applicationUrl ? updates.applicationUrl.trim() : undefined;
  if (normalizedUrl && !normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const updated = await prisma.application.update({
    where: { id: app.id },
    data: {
      ...(normalizedUrl ? { applicationUrl: normalizedUrl } : {}),
      ...(updates.salary ? { salary: updates.salary } : {}),
      ...(updates.location ? { location: updates.location } : {}),
      ...(updates.roleTitle ? { roleTitle: updates.roleTitle } : {}),
      ...(updates.notes ? { notes: updates.notes } : {}),
    },
  });

  return {
    id: updated.id,
    slug: updated.slug,
    companyName: updated.companyName,
    roleTitle: updated.roleTitle,
    status: updated.status,
    applicationUrl: updated.applicationUrl,
    salary: updated.salary,
    location: updated.location,
  };
}

/**
 * Execute Scheduling Follow-up
 */
export async function executeScheduleFollowUp(
  userId: string,
  identifier: string,
  targetDate: Date,
  note?: string
) {
  const app = await findApplication(userId, identifier);
  if (!app) {
    throw new Error(`Application "${identifier}" not found in your pipeline.`);
  }

  await prisma.application.update({
    where: { id: app.id },
    data: {
      nextFollowUpDate: targetDate,
      timelineEvents: {
        create: {
          eventType: TimelineEventType.FOLLOW_UP,
          description: note || `Scheduled follow-up for ${format(targetDate, "MMM d, yyyy")}`,
          date: new Date(),
        },
      },
    },
  });

  const calendarUrl = buildGoogleCalendarUrl({
    title: `Follow up: ${app.companyName} (${app.roleTitle})`,
    description: `Follow up on job application with ${app.companyName}.\nRole: ${app.roleTitle}\nStatus: ${app.status}\nNotes: ${note || app.notes || "None"}`,
    startDate: targetDate,
    durationMinutes: 15,
  });

  return {
    id: app.id,
    slug: app.slug,
    companyName: app.companyName,
    roleTitle: app.roleTitle,
    followUpDate: targetDate.toISOString(),
    calendarUrl,
  };
}

/**
 * Execute Note Addition
 */
export async function executeAddNote(
  userId: string,
  identifier: string,
  noteText: string
) {
  const app = await findApplication(userId, identifier);
  if (!app) {
    throw new Error(`Application "${identifier}" not found in your pipeline.`);
  }

  const existingNotes = app.notes ? `${app.notes}\n\n` : "";
  const updatedNotes = `${existingNotes}[${format(new Date(), "MMM d, yyyy")}] ${noteText}`;

  await prisma.application.update({
    where: { id: app.id },
    data: {
      notes: updatedNotes,
      timelineEvents: {
        create: {
          eventType: TimelineEventType.NOTE_ADDED,
          description: noteText,
          date: new Date(),
        },
      },
    },
  });

  return {
    id: app.id,
    slug: app.slug,
    companyName: app.companyName,
    note: noteText,
  };
}

/**
 * Generate Structured Email Draft
 */
export function generateEmailDraft(params: {
  companyName: string;
  roleTitle?: string;
  recipientName?: string;
  recipientEmail?: string;
  purpose: "follow_up" | "thank_you" | "status_inquiry" | "offer_negotiation";
  customContext?: string;
}) {
  const {
    companyName,
    roleTitle = "Product Designer",
    recipientName = "Hiring Team",
    recipientEmail = "",
    purpose,
    customContext,
  } = params;

  let subject = "";
  let body = "";

  if (purpose === "thank_you") {
    subject = `Thank you - ${roleTitle} interview (${companyName})`;
    body = `Hi ${recipientName},

Thank you so much for taking the time to speak with me today about the ${roleTitle} role at ${companyName}. I really enjoyed learning more about the team's upcoming roadmap and technical direction.

Our conversation reinforced my excitement about joining ${companyName}. I am particularly energized by the opportunity to contribute towards high-impact user experiences and collaborate closely with engineering.

Please let me know if there are any additional materials, portfolio samples, or references I can provide. I look forward to hearing about next steps!

Warm regards,
[Your Name]`;
  } else if (purpose === "offer_negotiation") {
    subject = `Offer Discussion - ${roleTitle} - [Your Name]`;
    body = `Hi ${recipientName},

Thank you again for extending the offer to join ${companyName} as ${roleTitle}! I am thrilled about the prospect of joining the team and contributing to your ambitious goals.

I've carefully reviewed the compensation details. Given my background, current market benchmarks, and the scope of responsibilities for this role, I would feel fully confident accepting immediately if we could align on a base salary of [Target Salary, e.g. $165k] or explore flexibility around equity/signing bonus.

I am deeply committed to making an impact at ${companyName} and would love to find a package that works well for both of us. Could we jump on a brief 10-minute call to discuss?

Best regards,
[Your Name]`;
  } else {
    // Default: follow_up / status_inquiry
    subject = `Following up: ${roleTitle} Application - [Your Name]`;
    body = `Hi ${recipientName},

I hope you're having a productive week!

I am following up on my recent application for the ${roleTitle} position at ${companyName}. I remain very enthusiastic about the opportunity to bring my experience to the team.

${customContext ? `Regarding our last conversation: ${customContext}\n\n` : ""}I wanted to check in to see if there are any updates regarding next steps in the review process, or if you need any additional information from my side.

Thank you very much for your time and consideration.

Best regards,
[Your Name]`;
  }

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const mailtoUrl = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${encodedSubject}&body=${encodedBody}`;

  return {
    recipientName,
    recipientEmail,
    companyName,
    subject,
    body,
    mailtoUrl,
    gmailUrl,
  };
}

/**
 * Generate Structured Interview Prep
 */
export function generateInterviewPrep(companyName: string, roleTitle: string, notes?: string | null) {
  return {
    companyName,
    roleTitle,
    keyFocusAreas: [
      `Deep product understanding of ${companyName}'s core business & user retention drivers`,
      `Demonstrating end-to-end craft, architectural tradeoffs, and measurable product outcomes`,
      `Cross-functional collaboration with PMs, Designers, and Technical Leads`,
      `Handling ambiguity, tight feedback loops, and rapid product iteration`,
    ],
    technicalQuestions: [
      `"Walk us through the most technically challenging project you led. What tradeoffs did you make and what would you do differently?"`,
      `"How do you approach performance optimization and edge cases when shipping critical features at scale?"`,
      `"How do you design systems or components that remain maintainable and scalable as team size grows?"`,
    ],
    behavioralQuestions: [
      `"Tell me about a time you strongly disagreed with a stakeholder or design decision. How did you resolve it?"`,
      `"Describe a situation where a launch didn't go as planned or metrics were missed. How did you react?"`,
      `"Why ${companyName} specifically over other opportunities in the space?"`,
    ],
    questionsToAskInterviewer: [
      `"What does success look like in this role in the first 90 days?"`,
      `"What is the biggest engineering or product bottleneck the team is currently solving?"`,
      `"How does the team balance shipping velocity against technical debt and long-term polish?"`,
    ],
    preparationTips: [
      `Review recent blog posts, changelogs, and product releases from ${companyName}.`,
      notes ? `Keep in mind your past notes: "${notes}"` : `Review the original job description and map 3 of your strongest career stories directly to the requirements.`,
      `Prepare a crisp 90-second answer for "Tell me about yourself" that ends with why this role at ${companyName} is the logical next step.`,
    ],
  };
}

/**
 * Smart Heuristic / Local NLP Fallback Engine
 * Handles full conversational interactions with actual DB execution without requiring an API key.
 */
export async function processSmartLocalRequest(
  userId: string,
  message: string,
  pipeline: Awaited<ReturnType<typeof getPipelineContext>>
): Promise<CopilotResponse> {
  const lower = message.trim().toLowerCase();

  // 1. Pipeline Summary / Analytics
  if (
    lower.includes("summary") ||
    lower.includes("overview") ||
    lower.includes("how many") ||
    lower.includes("stats") ||
    lower.includes("analytics") ||
    lower.includes("conversion")
  ) {
    const active = pipeline.activeCount;
    const total = pipeline.total;
    const interviews = pipeline.statusCounts["INTERVIEW"] || 0;
    const screenings = pipeline.statusCounts["SCREENING"] || 0;
    const offers = pipeline.statusCounts["OFFER"] || 0;
    const ghosted = pipeline.statusCounts["GHOSTED"] || 0;
    const applied = pipeline.statusCounts["APPLIED"] || 0;
    const overdue = pipeline.overdueFollowUps.length;

    let reply = `### 📊 Your Pipeline Snapshot\n\n`;
    reply += `You have **${total} total applications** tracked, with **${active} currently active**:\n\n`;
    reply += `- **Applied**: ${applied}\n`;
    reply += `- **Screening**: ${screenings}\n`;
    reply += `- **Interview**: ${interviews}\n`;
    reply += `- **Offers**: ${offers} 🎉\n`;
    reply += `- **Ghosted**: ${ghosted}\n\n`;

    if (overdue > 0) {
      reply += `⚠️ **Attention Needed**: You have **${overdue} overdue follow-up${overdue > 1 ? "s" : ""}** that haven't received an update recently.\n`;
    }

    if (interviews > 0) {
      const interviewCompanies = pipeline.applications
        .filter((a) => a.status === "INTERVIEW")
        .map((a) => `**${a.companyName}** (${a.roleTitle})`)
        .join(", ");
      reply += `\n🎯 **Active Interviews**: ${interviewCompanies}`;
    }

    return {
      reply,
      suggestions: [
        overdue > 0 ? "Show overdue follow-ups" : "Show active interviews",
        "Prep for interview",
        "Track a new application",
      ],
      providerUsed: "smart-local",
      model: "Hyir Local Agent",
    };
  }

  // 2. Overdue Follow-ups Query
  if (
    lower.includes("overdue") ||
    lower.includes("stale") ||
    (lower.includes("follow") && (lower.includes("show") || lower.includes("what") || lower.includes("list") || lower.includes("check") || lower.includes("pending") || lower === "follow ups" || lower === "follow-ups"))
  ) {
    if (pipeline.overdueFollowUps.length === 0) {
      return {
        reply: `✨ **Great news!** You have no overdue follow-ups right now. All your active conversations are on track.`,
        suggestions: ["Pipeline summary", "Show active interviews", "Track new job"],
        providerUsed: "smart-local",
        model: "Hyir Local Agent",
      };
    }

    let reply = `### ⏰ Overdue Follow-ups (${pipeline.overdueFollowUps.length})\n\nHere are applications that need your attention:\n\n`;
    for (const app of pipeline.overdueFollowUps.slice(0, 5)) {
      reply += `- **${app.companyName}** · ${app.roleTitle} (Due: ${app.nextFollowUpDate ? format(new Date(app.nextFollowUpDate), "MMM d") : "Past due"})\n`;
    }
    reply += `\nYou can tell me: *"Draft follow-up email for ${pipeline.overdueFollowUps[0].companyName}"* or *"Schedule follow-up for ${pipeline.overdueFollowUps[0].companyName} next Monday"*.`;

    return {
      reply,
      suggestions: [
        `Draft follow-up for ${pipeline.overdueFollowUps[0].companyName}`,
        `Snooze ${pipeline.overdueFollowUps[0].companyName} by 7 days`,
        "Ghost inactive applications",
      ],
      providerUsed: "smart-local",
      model: "Hyir Local Agent",
    };
  }

  // 3. Status Update (e.g. "Mark HSV Digital as Ghosted", "Move Figma to Interview", "Stripe to Offer")
  const statusMatch =
    lower.match(/(?:mark|move|set|change|update)\s+([a-zA-Z0-9\s.-]+?)\s+(?:as|to|status to)\s+([a-zA-Z\s_]+)/i) ||
    lower.match(/([a-zA-Z0-9\s.-]+?)\s+(?:moved to|is now|to)\s+(interview|offer|rejected|ghosted|screening|applied|saved|assignment)/i);

  if (statusMatch) {
    const rawCompany = statusMatch[1].trim();
    const rawStatus = statusMatch[2].trim().toUpperCase().replace(/\s+/g, "_");

    const validStatus = Object.values(ApplicationStatus).find(
      (s) => s === rawStatus || s.toLowerCase() === rawStatus.toLowerCase()
    );

    if (validStatus) {
      try {
        const result = await executeUpdateStatus(userId, rawCompany, validStatus);
        return {
          reply: `Updated **${result.companyName}** stage from **${result.previousStatus}** to **${result.newStatus}**. Timeline event recorded!`,
          action: {
            type: "STATUS_UPDATED",
            app: result,
          },
          suggestions: [
            `Prep for ${result.companyName} interview`,
            `Draft follow-up for ${result.companyName}`,
            "Show pipeline summary",
          ],
          providerUsed: "smart-local",
          model: "Hyir Local Agent",
        };
      } catch (err: any) {
        return {
          reply: `⚠️ ${err.message || "Could not find that application."}`,
          suggestions: ["List all applications", "Pipeline summary"],
          providerUsed: "smart-local",
          model: "Hyir Local Agent",
        };
      }
    }
  }

  // 4. Create Application (e.g. "Track a new application for Stripe - Senior Designer via LinkedIn", "Add Figma as Product Designer")
  const trackMatch =
    lower.match(/(?:track|add|create)\s+(?:(?:a\s+)?(?:new\s+)?(?:application|job|role)\s+)?(?:for\s+)?([a-zA-Z0-9\s.-]+?)\s+(?:as|role|for role|-)\s+([a-zA-Z0-9\s/.,&+-]+)/i) ||
    lower.match(/track\s+(?:(?:a\s+)?(?:new\s+)?(?:application|job|role)\s+)?(?:for\s+)?([a-zA-Z0-9\s.-]+?)\s*-\s*([a-zA-Z0-9\s/.,&+-]+)/i);

  if (trackMatch) {
    let company = trackMatch[1]
      .replace(/^(?:(?:a\s+)?(?:new\s+)?(?:application|job|role)\s+)?(?:for\s+)?/i, "")
      .replace(/via\s+.*$/i, "")
      .trim();
    let role = trackMatch[2].trim();
    let source: string | undefined = undefined;
    let salary: string | undefined = undefined;

    // Extract source if present
    const sourceMatch = message.match(/via\s+([a-zA-Z0-9]+)/i);
    if (sourceMatch) {
      source = sourceMatch[1];
      role = role.replace(/via\s+.*$/i, "").trim();
    }

    // Extract salary if present
    const salaryMatch = message.match(/(?:\$|₹|£|\b\d+k|\b\d+\s*lpa)/i);
    if (salaryMatch) {
      const salaryPart = message.slice(salaryMatch.index!);
      salary = salaryPart.trim();
    }

    try {
      const result = await executeCreateApplication(userId, {
        companyName: company,
        roleTitle: role,
        source,
        salary,
        status: "APPLIED",
        nextFollowUpDays: 7,
      });

      return {
        reply: `🚀 Successfully tracked new application for **${result.companyName}** as **${result.roleTitle}**! Follow-up scheduled for 7 days from now.`,
        action: {
          type: "APPLICATION_CREATED",
          app: result,
        },
        suggestions: [
          `Schedule calendar follow-up for ${result.companyName}`,
          `Add note for ${result.companyName}`,
          "View pipeline",
        ],
        providerUsed: "smart-local",
        model: "Hyir Local Agent",
      };
    } catch (err: any) {
      return {
        reply: `⚠️ Could not create application: ${err.message}`,
        suggestions: ["Pipeline summary"],
        providerUsed: "smart-local",
        model: "Hyir Local Agent",
      };
    }
  }

  // 5. Schedule Follow-up (e.g. "Schedule follow-up for Linear in 5 days", "Follow up with Vercel on Monday")
  const followUpMatch = lower.match(/(?:schedule|set)\s+(?:a\s+)?follow[-\s]?up\s+(?:for|with)\s+([a-zA-Z0-9.-]+)(?:\s+(?:in|on|for)\s+(.*))?/i);
  if (followUpMatch) {
    const company = followUpMatch[1].trim();
    const timeSpec = followUpMatch[2] ? followUpMatch[2].trim() : "5 days";
    
    let daysToAdd = 5;
    const daysMatch = timeSpec.match(/(\d+)\s*day/i);
    if (daysMatch) {
      daysToAdd = parseInt(daysMatch[1], 10);
    } else if (timeSpec.includes("week")) {
      daysToAdd = 7;
    } else if (timeSpec.includes("tomorrow")) {
      daysToAdd = 1;
    }

    try {
      const targetDate = addDays(new Date(), daysToAdd);
      const result = await executeScheduleFollowUp(userId, company, targetDate);

      return {
        reply: `📅 Scheduled follow-up for **${result.companyName}** on **${format(targetDate, "EEEE, MMMM d, yyyy")}**. You can also add it directly to your Google Calendar below:`,
        action: {
          type: "FOLLOW_UP_SCHEDULED",
          app: result,
        },
        suggestions: [
          `Draft follow-up email for ${result.companyName}`,
          `Prep for ${result.companyName}`,
          "Show pipeline",
        ],
        providerUsed: "smart-local",
        model: "Hyir Local Agent",
      };
    } catch (err: any) {
      return {
        reply: `⚠️ ${err.message}`,
        suggestions: ["Pipeline summary"],
        providerUsed: "smart-local",
        model: "Hyir Local Agent",
      };
    }
  }

  // 6. Draft Email (e.g. "Draft follow-up email to Guillermo at Vercel", "Write a thank-you note for Stripe")
  if (lower.includes("draft") || lower.includes("email") || lower.includes("write a note") || lower.includes("thank-you") || lower.includes("outreach")) {
    // Find matching company in pipeline
    let targetApp = pipeline.applications.find((a) => lower.includes(a.companyName.toLowerCase()));
    if (!targetApp && pipeline.applications.length > 0) {
      targetApp = pipeline.applications[0];
    }

    const company = targetApp ? targetApp.companyName : "the company";
    const role = targetApp ? targetApp.roleTitle : "Software Role";
    const recipient = targetApp?.contactName || "Hiring Manager";

    let purpose: "follow_up" | "thank_you" | "status_inquiry" | "offer_negotiation" = "follow_up";
    if (lower.includes("thank") || lower.includes("interviewed")) {
      purpose = "thank_you";
    } else if (lower.includes("negotiat") || lower.includes("offer") || lower.includes("counter")) {
      purpose = "offer_negotiation";
    }

    const email = generateEmailDraft({
      companyName: company,
      roleTitle: role,
      recipientName: recipient,
      recipientEmail: targetApp?.contactEmail || "",
      purpose,
    });

    return {
      reply: `✉️ Here is a tailored **${purpose.replace("_", " ")}** email ready for **${company}**:`,
      action: {
        type: "EMAIL_DRAFTED",
        email,
      },
      suggestions: [
        `Schedule follow-up for ${company} in 5 days`,
        `Prep for ${company} interview`,
        "Show pipeline summary",
      ],
      providerUsed: "smart-local",
      model: "Hyir Local Agent",
    };
  }

  // 7. Interview Prep (e.g. "Prep for Figma interview", "Interview questions for Linear")
  if (lower.includes("prep") || lower.includes("questions") || lower.includes("interview")) {
    let targetApp = pipeline.applications.find((a) => lower.includes(a.companyName.toLowerCase()));
    if (!targetApp) {
      targetApp = pipeline.applications.find((a) => a.status === "INTERVIEW" || a.status === "SCREENING") || pipeline.applications[0];
    }

    const company = targetApp ? targetApp.companyName : "Target Company";
    const role = targetApp ? targetApp.roleTitle : "Product Designer";

    const prep = generateInterviewPrep(company, role, targetApp?.notes);

    return {
      reply: `🎯 **Interview Prep Toolkit for ${company} (${role})**\n\nI've generated targeted questions and focus areas based on this role:`,
      action: {
        type: "INTERVIEW_PREP",
        prep,
      },
      suggestions: [
        `Draft thank-you email for ${company}`,
        `Schedule follow-up for ${company}`,
        "Show active interviews",
      ],
      providerUsed: "smart-local",
      model: "Hyir Local Agent",
    };
  }

  // 8. General / Fallback Conversational Response
  return {
    reply: `👋 I'm your **Hyir Copilot**. I have full visibility into your active job hunt pipeline.\n\nHere are things you can ask me to do right now:\n\n- 📊 *"Show my pipeline summary"* or *"How many interviews do I have?"*\n- ⏰ *"Show overdue follow-ups"*\n- 🚀 *"Track a new application for Stripe - Senior Designer via LinkedIn"*\n- 🔄 *"Mark Vercel as Interview"* or *"Move Acme to Ghosted"*\n- ✉️ *"Draft follow-up email for Guillermo at Vercel"*\n- 🎯 *"Prep for my Figma interview"*\n\n*(Tip: Add your Gemini API key in settings above to activate full Gemini 2.5 Flash reasoning!)*`,
    suggestions: [
      "Pipeline summary",
      "Show overdue follow-ups",
      "Prep for my next interview",
      "Track new job",
    ],
    providerUsed: "smart-local",
    model: "Hyir Local Agent",
  };
}

/**
 * Gemini 2.0 / 2.5 Flash Tool Declarations
 */
const geminiTools = [
  {
    functionDeclarations: [
      {
        name: "updateApplicationStatus",
        description: "Update the status of an application in the user's pipeline (e.g. SAVED, APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED, GHOSTED).",
        parameters: {
          type: "OBJECT",
          properties: {
            companyName: { type: "STRING", description: "The name of the company or application identifier" },
            newStatus: {
              type: "STRING",
              description: "The new status: SAVED, APPLIED, CONTACTED, SCREENING, INTERVIEW, ASSIGNMENT, OFFER, ACCEPTED, REJECTED, GHOSTED, WITHDRAWN",
            },
          },
          required: ["companyName", "newStatus"],
        },
      },
      {
        name: "createApplication",
        description: "Track and create a new job application in the user's pipeline.",
        parameters: {
          type: "OBJECT",
          properties: {
            companyName: { type: "STRING", description: "The hiring company name" },
            roleTitle: { type: "STRING", description: "The role / position title" },
            applicationUrl: { type: "STRING", description: "The job application URL or company website (e.g. limegreen.studio/ or https://...)" },
            salary: { type: "STRING", description: "Salary range if mentioned (e.g. $140k - $160k)" },
            source: { type: "STRING", description: "Application source (e.g. LinkedIn, Referral, Instahyre, Direct)" },
            status: { type: "STRING", description: "Initial status (e.g. SAVED, APPLIED, CONTACTED, SCREENING, INTERVIEW, OFFER, ACCEPTED)" },
            location: { type: "STRING", description: "Location or Remote" },
            notes: { type: "STRING", description: "Any initial notes" },
          },
          required: ["companyName", "roleTitle"],
        },
      },
      {
        name: "updateApplicationDetails",
        description: "Update details of an existing application such as website URL (applicationUrl), salary, location, role title, or notes.",
        parameters: {
          type: "OBJECT",
          properties: {
            companyName: { type: "STRING", description: "The name of the company or application identifier" },
            applicationUrl: { type: "STRING", description: "The job posting URL or company website (e.g. https://...)" },
            salary: { type: "STRING", description: "Updated salary details" },
            location: { type: "STRING", description: "Updated location" },
            roleTitle: { type: "STRING", description: "Updated role title" },
            notes: { type: "STRING", description: "Updated notes" },
          },
          required: ["companyName"],
        },
      },
      {
        name: "scheduleFollowUp",
        description: "Schedule a follow-up date for an existing application and generate a Google Calendar event.",
        parameters: {
          type: "OBJECT",
          properties: {
            companyName: { type: "STRING", description: "The name of the company" },
            daysFromNow: { type: "INTEGER", description: "Number of days from today to set the follow-up" },
            notes: { type: "STRING", description: "Context or reminder note" },
          },
          required: ["companyName", "daysFromNow"],
        },
      },
      {
        name: "draftEmail",
        description: "Draft a personalized email for follow-up, interview thank you, inquiry, or negotiation.",
        parameters: {
          type: "OBJECT",
          properties: {
            companyName: { type: "STRING", description: "Company name" },
            recipientName: { type: "STRING", description: "Recruiter or contact name if available" },
            purpose: {
              type: "STRING",
              description: "Purpose of email: 'follow_up', 'thank_you', 'status_inquiry', or 'offer_negotiation'",
            },
            context: { type: "STRING", description: "Specific details to include in draft" },
          },
          required: ["companyName", "purpose"],
        },
      },
      {
        name: "interviewPrep",
        description: "Generate comprehensive interview prep questions, key focus areas, and questions to ask the interviewer.",
        parameters: {
          type: "OBJECT",
          properties: {
            companyName: { type: "STRING", description: "The company name" },
            roleTitle: { type: "STRING", description: "The role title" },
          },
          required: ["companyName"],
        },
      },
    ],
  },
];

/**
 * Main Copilot Engine Entry Point
 */
export async function processCopilotRequest(params: ProcessCopilotRequestParams): Promise<CopilotResponse> {
  const { userId, message, history = [], apiKey: customApiKey } = params;

  // 1. Fetch live snapshot of user's pipeline
  const pipeline = await getPipelineContext(userId);

  // 2. Resolve Gemini API Key
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    // Graceful smart local agent fallback
    return processSmartLocalRequest(userId, message, pipeline);
  }

  // 3. Prepare Gemini Prompt with System Instructions & State Context
  const systemInstruction = `You are Hyir Copilot, an elite personal executive AI assistant for job seekers.
You manage the user's active job pipeline directly, execute status updates, track new applications, schedule follow-ups, draft emails, and prepare for interviews.

User's Real Pipeline Context (${pipeline.total} applications total, ${pipeline.activeCount} active):
- Overdue Follow-ups (${pipeline.overdueFollowUps.length}): ${pipeline.overdueFollowUps.map((a) => `${a.companyName} (${a.roleTitle})`).join(", ") || "None"}
- Active Interviews & Screenings (${pipeline.interviewStages.length}): ${pipeline.interviewStages.map((a) => `${a.companyName} (${a.roleTitle} - ${a.status})`).join(", ") || "None"}
- Offers (${pipeline.offers.length}): ${pipeline.offers.map((a) => `${a.companyName} (${a.roleTitle})`).join(", ") || "None"}
- All Tracked Companies: ${pipeline.applications.map((a) => `${a.companyName} [${a.status}]`).join(", ")}

Instructions:
1. When the user asks to change stage, track a new job, schedule a follow-up, update details, or draft an email, CALL the appropriate tool.
2. If the user provides a URL or website (e.g. 'limegreen.studio/', 'https://company.com'), ALWAYS pass it as 'applicationUrl' to createApplication or updateApplicationDetails.
3. If the user specifies a status (e.g. 'accepted', 'interview', 'offer', 'applied'), map it to the valid ApplicationStatus in the status parameter.
4. Be concise, sharp, and encouraging. Use clean Markdown styling with bold headers and bullet points.
5. Provide actionable suggestions at the end of each answer.`;

  try {
    const contents: any[] = [];

    // Include recent history (last 4 turns)
    const recentHistory = history.slice(-4);
    for (const h of recentHistory) {
      contents.push({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];
    let res: Response | null = null;
    let usedModel = "gemini-3.5-flash-lite";

    for (const model of modelsToTry) {
      usedModel = model;
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            tools: geminiTools,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1200,
            },
          }),
        }
      );

      if (res.ok) break;
      console.warn(`Gemini model ${model} returned ${res.status}, trying fallback...`);
    }

    if (!res || !res.ok) {
      console.warn("All Gemini models failed, falling back to local agent:", res ? await res.text() : "no response");
      return processSmartLocalRequest(userId, message, pipeline);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let toolCall: { name: string; args: any } | null = null;
    let modelReply = "";

    for (const part of parts) {
      if (part.functionCall) {
        toolCall = {
          name: part.functionCall.name,
          args: part.functionCall.args,
        };
      }
      if (part.text) {
        modelReply += part.text;
      }
    }

    // Handle Tool Call Execution
    if (toolCall) {
      let action: CopilotAction | undefined = undefined;

      if (toolCall.name === "updateApplicationStatus") {
        const { companyName, newStatus } = toolCall.args;
        const validStatus = Object.values(ApplicationStatus).find(
          (s) => s.toLowerCase() === (newStatus || "").toLowerCase()
        ) || ApplicationStatus.APPLIED;

        const result = await executeUpdateStatus(userId, companyName, validStatus);
        action = { type: "STATUS_UPDATED", app: result };
        if (!modelReply) {
          modelReply = `Moved **${result.companyName}** stage to **${result.newStatus}**. Timeline event has been logged!`;
        }
      } else if (toolCall.name === "createApplication") {
        const rawStatus = (toolCall.args.status || "APPLIED").toUpperCase().replace(/\s+/g, "_");
        const validStatus = Object.values(ApplicationStatus).find(
          (s) => s === rawStatus || s.toLowerCase() === rawStatus.toLowerCase()
        ) || ApplicationStatus.APPLIED;

        const result = await executeCreateApplication(userId, {
          companyName: toolCall.args.companyName,
          roleTitle: toolCall.args.roleTitle,
          status: validStatus,
          applicationUrl: toolCall.args.applicationUrl,
          salary: toolCall.args.salary,
          source: toolCall.args.source,
          location: toolCall.args.location,
          notes: toolCall.args.notes,
          nextFollowUpDays: 7,
        });
        action = { type: "APPLICATION_CREATED", app: result };
        if (!modelReply) {
          modelReply = `Tracked new application for **${result.companyName}** as **${result.roleTitle}**!`;
        }
      } else if (toolCall.name === "updateApplicationDetails") {
        const result = await executeUpdateApplicationDetails(userId, toolCall.args.companyName, {
          applicationUrl: toolCall.args.applicationUrl,
          salary: toolCall.args.salary,
          location: toolCall.args.location,
          roleTitle: toolCall.args.roleTitle,
          notes: toolCall.args.notes,
        });
        action = { type: "APPLICATION_UPDATED", app: result };
        if (!modelReply) {
          modelReply = `Updated application details for **${result.companyName}**!`;
        }
      } else if (toolCall.name === "scheduleFollowUp") {
        const targetDate = addDays(new Date(), toolCall.args.daysFromNow || 5);
        const result = await executeScheduleFollowUp(userId, toolCall.args.companyName, targetDate, toolCall.args.notes);
        action = { type: "FOLLOW_UP_SCHEDULED", app: result };
        if (!modelReply) {
          modelReply = `Scheduled follow-up for **${result.companyName}** on **${format(targetDate, "MMM d, yyyy")}**!`;
        }
      } else if (toolCall.name === "draftEmail") {
        const targetApp = pipeline.applications.find(
          (a) => a.companyName.toLowerCase() === (toolCall.args.companyName || "").toLowerCase()
        );
        const email = generateEmailDraft({
          companyName: toolCall.args.companyName,
          roleTitle: targetApp?.roleTitle || "Product Designer",
          recipientName: toolCall.args.recipientName || targetApp?.contactName || "Hiring Team",
          recipientEmail: targetApp?.contactEmail || "",
          purpose: toolCall.args.purpose || "follow_up",
          customContext: toolCall.args.context,
        });
        action = { type: "EMAIL_DRAFTED", email };
        if (!modelReply) {
          modelReply = `Generated draft email for **${toolCall.args.companyName}**:`;
        }
      } else if (toolCall.name === "interviewPrep") {
        const targetApp = pipeline.applications.find(
          (a) => a.companyName.toLowerCase() === (toolCall.args.companyName || "").toLowerCase()
        );
        const prep = generateInterviewPrep(
          toolCall.args.companyName,
          toolCall.args.roleTitle || targetApp?.roleTitle || "Product Designer",
          targetApp?.notes
        );
        action = { type: "INTERVIEW_PREP", prep };
        if (!modelReply) {
          modelReply = `Here is your interview prep kit for **${toolCall.args.companyName}**:`;
        }
      }

      return {
        reply: modelReply,
        action,
        suggestions: [
          "Pipeline summary",
          "Show overdue follow-ups",
          "Prep for interview",
        ],
        providerUsed: "gemini",
        model: "Gemini 3.5 Flash",
      };
    }

    // Default conversational reply from Gemini
    return {
      reply: modelReply || "I've reviewed your pipeline. How else can I assist your job hunt?",
      suggestions: [
        "Pipeline summary",
        "Show overdue follow-ups",
        "Prep for interview",
      ],
      providerUsed: "gemini",
      model: "Gemini 3.5 Flash",
    };
  } catch (err: any) {
    console.error("Gemini invocation error, using local fallback:", err);
    return processSmartLocalRequest(userId, message, pipeline);
  }
}
