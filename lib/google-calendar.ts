import { prisma } from "@/lib/prisma";

export interface GoogleCalendarEventParams {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  durationMinutes?: number;
}

/**
 * Builds a 1-click Google Calendar Web Intent URL
 * Example: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...
 */
export function buildGoogleCalendarUrl(params: GoogleCalendarEventParams): string {
  const { title, description, location, startDate, durationMinutes = 30 } = params;

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const formatGCalDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d+/g, "");
  };

  const datesParam = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", datesParam);

  if (description) {
    url.searchParams.set("details", description);
  }
  if (location) {
    url.searchParams.set("location", location);
  }

  return url.toString();
}

/**
 * Programmatically create an event via Google Calendar API if user has Google OAuth token
 */
export async function createGoogleCalendarApiEvent(
  userId: string,
  params: GoogleCalendarEventParams
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        providerId: "google",
      },
    });

    if (!account?.accessToken) {
      return { success: false, error: "No Google account connected" };
    }

    const { title, description, location, startDate, durationMinutes = 30 } = params;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const eventPayload = {
      summary: title,
      description: description || "",
      location: location || "",
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 15 },
          { method: "email", minutes: 60 },
        ],
      },
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error?.message || "Failed to create Google Calendar event" };
    }

    const data = await res.json();
    return { success: true, eventId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
