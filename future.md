# Future Roadmap & Feature Specs

## Automated Email Ingestion & Job Status Classification Pipeline

### Overview
Automate application tracking by integrating user email inboxes (Gmail / Outlook) with an AI-powered extraction and status classification pipeline that detects job applications, interview invitations, assessments, offers, and rejections.

---

### 1. Authentication & OAuth Scopes
* **Auth Layer**: NextAuth / Auth.js with Google & Microsoft providers.
* **Scopes**:
  * `openid email profile` (user identification)
  * `https://www.googleapis.com/auth/gmail.readonly` (read-only access to emails)
* **Token Management**:
  * Securely store `access_token` and `refresh_token` in Prisma `Account` / `User` tables for background syncing without re-prompting logins.

---

### 2. Email Querying & Ingestion Strategy
Rather than scanning every email, query specific recruiter & ATS signals:
* **Search Filter Query**:
  ```text
  from:(greenhouse.io OR lever.co OR ashbyhq.com OR workday.com OR smartrecruiters.com OR "careers@" OR "recruiting@") 
  OR subject:("application" OR "interview" OR "offer" OR "status of your application" OR "invitation to interview")
  ```
* **Incremental Sync**:
  * Track `lastSyncedAt` or Gmail `historyId` per user so only new messages since the last sync are fetched.

---

### 3. Extraction & Classification Engine (AI Pipeline)

#### Stage A: Entity Extraction
* **Company Name**: Derived from sender domain (e.g. `jobs.lever.co/stripe` $\rightarrow$ Stripe) or body header.
* **Role Title**: Extracted from subject line or initial greeting (e.g. *"Application for Senior Product Designer"*).
* **Date & Point of Contact**: Recruiter name/email and scheduled dates.

#### Stage B: Structured Classification (LLM Prompt & Schema)
Pass sanitized email body into a fast structured LLM (e.g. Gemini Flash) returning:

```json
{
  "company": "Figma",
  "role": "Product Designer",
  "eventType": "INTERVIEW_INVITATION", 
  "status": "INTERVIEW",
  "summary": "Recruiter reached out with Calendly link for 30m screening call",
  "detectedDate": "2026-08-28T10:00:00Z",
  "actionRequired": true,
  "confidence": 0.96
}
```

**Supported Status Types**:
* `APPLIED` (Confirmation of received application)
* `SCREENING` / `INTERVIEW` (Interview invite / scheduling link)
* `ASSIGNMENT` (Take-home assessment / coding challenge)
* `OFFER` (Offer letter / congratulatory notice)
* `REJECTED` (Notice of moving forward with other candidates)

---

### 4. Database & UI Synchronization
1. **Application Matcher**:
   * Search Prisma database by `companyName` or application URL.
   * If existing record found: Update `status`, add a new `TimelineEvent`, and update `nextFollowUpDate`.
   * If new company: Optionally auto-create a new `Application` under `APPLIED`.
2. **Review & Sync Interface**:
   * An optional review inbox (e.g. *"3 new job updates detected — [Review & Sync]"*) allowing manual approval before mutating data.
3. **Ambient Ray Lighting Integration**:
   * **🚨 Urgent State**: Incoming deadline / follow-up action triggers the warm amber + coral red rays (`#ffecb0` + `#ff8a8a`).
   * **🎉 Good News State**: Incoming offer / accepted position triggers the electric sky blue rays (`#38bdf8` + `#818cf8`).
   * **✨ Calm State**: Default clean monochromatic silver rays.

---

### 5. Privacy & Security Safeguards
* Enforce read-only scopes strictly (`gmail.readonly`).
* Store only extracted metadata (company, role, snippet, date), never full inbox dumps.
* Allow users to disconnect their email and purge cached tokens at any time.
