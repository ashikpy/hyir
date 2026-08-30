import { prisma } from "@/lib/prisma";

export interface RawJobEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  date: Date;
  snippet: string;
  body: string;
}

/**
 * Retrieves and automatically refreshes Google OAuth access token for a given user
 */
export async function getValidGoogleAccessToken(
  userId: string
): Promise<{ token: string | null; error?: string }> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        providerId: "google",
      },
    });

    if (!account) {
      return { token: null, error: "No Google account connected. Please sign in with Google." };
    }

    if (!account.accessToken) {
      return { token: null, error: "No access token found for Google account." };
    }

    // Check if current access token is still valid (with 2-minute safety margin)
    const now = new Date();
    if (account.accessTokenExpiresAt && new Date(account.accessTokenExpiresAt.getTime() - 120000) > now) {
      return { token: account.accessToken };
    }

    // If token is expired but we have a refresh token, refresh it
    if (account.refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return { token: account.accessToken }; // Fall back to current token if secrets missing
      }

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: account.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (res.ok) {
        const tokenData = await res.json();
        const newExpiresAt = tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : new Date(Date.now() + 3600 * 1000);

        await prisma.account.update({
          where: { id: account.id },
          data: {
            accessToken: tokenData.access_token,
            accessTokenExpiresAt: newExpiresAt,
          },
        });

        return { token: tokenData.access_token };
      }
    }

    // Return existing token as fallback
    return { token: account.accessToken };
  } catch (err: any) {
    console.error("Error retrieving/refreshing Google access token:", err);
    return { token: null, error: err?.message || "Failed to authenticate with Google" };
  }
}

/**
 * Parses email address and display name from a standard 'From' header
 * e.g. "Sarah Connor <sarah@linear.app>" -> { name: "Sarah Connor", email: "sarah@linear.app" }
 */
function parseFromHeader(fromHeader: string): { name: string; email: string } {
  if (!fromHeader) return { name: "", email: "" };
  
  const match = fromHeader.match(/^(.*?)\s*<([^>]+)>/);
  if (match) {
    const name = match[1].replace(/^["']|["']$/g, "").trim();
    const email = match[2].trim();
    return { name: name || email.split("@")[0], email };
  }
  
  return { name: fromHeader.split("@")[0], email: fromHeader.trim() };
}

/**
 * Decodes base64url encoded email body payload
 */
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Extracts plaintext content recursively from Gmail payload parts
 */
function extractBodyFromPayload(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data && payload.mimeType === "text/plain") {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    // Look for text/plain first
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    // Fall back to text/html stripped of tags
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
      if (part.parts) {
        const nested = extractBodyFromPayload(part);
        if (nested) return nested;
      }
    }
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data).replace(/<[^>]+>/g, " ").trim();
  }

  return "";
}

/**
 * Fetches recent job-related emails from Gmail for the given user
 */
export async function fetchRecentJobEmails(
  userId: string,
  options?: {
    maxResults?: number;
    daysBack?: number;
    customQuery?: string;
  }
): Promise<{ success: boolean; emails: RawJobEmail[]; error?: string }> {
  const { maxResults = 15, daysBack = 14, customQuery } = options || {};

  const { token, error: authError } = await getValidGoogleAccessToken(userId);
  if (!token) {
    return { success: false, emails: [], error: authError || "Unauthorized" };
  }

  try {
    const epochSeconds = Math.floor((Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000);
    
    // Targeted search query looking for recruitment, status, interview, and offer correspondence
    const query =
      customQuery ||
      `after:${epochSeconds} (subject:("interview" OR "application" OR "applied" OR "status of your" OR "invitation" OR "offer" OR "screening" OR "next steps" OR "thank you for applying" OR "role" OR "position" OR "recruiter" OR "hiring"))`;

    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("q", query);
    listUrl.searchParams.set("maxResults", String(maxResults));

    const listRes = await fetch(listUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!listRes.ok) {
      const errData = await listRes.json().catch(() => ({}));
      const msg = errData?.error?.message || "Failed to search Gmail messages";
      if (listRes.status === 403 || listRes.status === 401) {
        return {
          success: false,
          emails: [],
          error: "Gmail permission not granted. Please sign in with Google and allow Gmail access.",
        };
      }
      return { success: false, emails: [], error: msg };
    }

    const listData = await listRes.json();
    const messageRefs: Array<{ id: string; threadId: string }> = listData.messages || [];

    if (messageRefs.length === 0) {
      return { success: true, emails: [] };
    }

    // Fetch message details in parallel
    const emailPromises = messageRefs.map(async (ref) => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!msgRes.ok) return null;
        const msgData = await msgRes.json();

        const headers: Record<string, string> = {};
        for (const h of msgData.payload?.headers || []) {
          headers[h.name.toLowerCase()] = h.value;
        }

        const from = headers["from"] || "";
        const subject = headers["subject"] || "(No Subject)";
        const dateStr = headers["date"] || "";
        const date = dateStr ? new Date(dateStr) : new Date(parseInt(msgData.internalDate || `${Date.now()}`));

        const { name: fromName, email: fromEmail } = parseFromHeader(from);
        const body = extractBodyFromPayload(msgData.payload);

        return {
          id: msgData.id,
          threadId: msgData.threadId,
          subject,
          from,
          fromName,
          fromEmail,
          date,
          snippet: msgData.snippet || "",
          body: body.slice(0, 3000), // Trim body to reasonable token limit
        } as RawJobEmail;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    const emails = results.filter((e): e is RawJobEmail => e !== null);

    return { success: true, emails };
  } catch (err: any) {
    console.error("Error in fetchRecentJobEmails:", err);
    return { success: false, emails: [], error: err?.message || "Failed to fetch emails" };
  }
}
