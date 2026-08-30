# Hyir AI Copilot & Chatbot Roadmap

A native, state-aware AI assistant and command copilot embedded directly into Hyir to automate pipeline querying, data entry, follow-ups, and interview preparation.

---

## 1. Overview & Vision

The Hyir Copilot transforms static job tracking into an intelligent personal executive assistant. Instead of navigating multiple pages and typing data manually into forms, the user can query and control their entire application pipeline via natural language, shortcut commands (`⌘J`), and voice/text input.

---

## 2. Core Capabilities & Use Cases

### A. Intelligent Pipeline Querying (Natural Language Analytics)
* *"How many applications have I submitted this week?"*
* *"Show me all applications from Instahyre where salary is above ₹20 LPA."*
* *"Which active interview pipelines haven't had an update in over 7 days?"*
* *"What's my interview conversion rate this month compared to last month?"*

### B. Copilot Actions & Tool Calling (Instant Execution)
* **Status Updates**: *"Mark HSV Digital as Ghosted."* / *"Move Techpix to Interview round."*
* **Application Creation**: *"Track a new application for Stripe - Senior Designer via LinkedIn."*
* **Follow-up & Calendar Scheduling**: *"Schedule a follow-up for RentOk in 5 days on Google Calendar."*
* **Data Enrichment**: *"Set the recruiter for Cypherock to Alex (alex@cypherock.com) and salary to $140k."*

### C. Application & Interview Prep (Content Generation)
* **Follow-up Email Drafter**: *"Draft a polite follow-up email to Sarah at HSV Digital inquiring about next steps."*
* **Rejection / Counter Response**: *"Write a thank-you note expressing continued interest after a phone screen."*
* **Role-Specific Interview Questions**: *"Based on my notes and role title for Linear, what are 5 key technical & behavioral questions I should prepare for?"*
* **Company Insights**: *"Summarize recent news and business model for Outdoo AI."*

---

## 3. Architecture & Technical Design

### Frontend (UI/UX)
* **Floating Command Drawer / Slide-out**:
  - Global hotkey shortcut: `⌘J` (or `Ctrl+J`) and bottom-right floating trigger button.
  - Linear-inspired dark-mode minimal interface with streaming message bubble UI.
  - Quick action suggestion chips (*"Overdue Follow-ups"*, *"Ghost Inactive"*, *"Prep for Interview"*).
* **Streaming Responses**:
  - Vercel AI SDK (`ai/react` `useChat`) with token streaming for <250ms time-to-first-token.

### Backend & API
* **Route Handler**: `/api/chat` (Edge / Node runtime) utilizing Google Gemini 2.5 Flash / OpenRouter.
* **Database & Context Injection**:
  - Automatically loads the authenticated user's current pipeline snapshot into the LLM system context.
  - Strict tenant isolation (scoped to `userId`).

### Tool Calling Definitions
```typescript
const tools = {
  getApplications: {
    description: 'Fetch and filter user applications by status, broker, date, or salary.',
    parameters: z.object({ ... })
  },
  updateApplicationStatus: {
    description: 'Update application stage (SAVED, APPLIED, INTERVIEW, OFFER, REJECTED, GHOSTED).',
    parameters: z.object({ ... })
  },
  createApplication: {
    description: 'Track a new job application with company, role, source, and salary.',
    parameters: z.object({ ... })
  },
  scheduleFollowUp: {
    description: 'Set follow-up date and generate Google Calendar event link.',
    parameters: z.object({ ... })
  },
  draftEmail: {
    description: 'Draft customized outreach, follow-up, or negotiation emails.',
    parameters: z.object({ ... })
  }
}
```

---

## 4. SaaS Feasibility & Monetization Model

### Cost Efficiency
* **Model Choice**: Google Gemini 2.5 Flash / Claude 3.5 Haiku.
* **Unit Economics**: ~$0.0001 - $0.0003 per query.
* **Monthly Active User Cost**: 100 queries/month costs **~$0.02 - $0.05 / user**.
* **Gross Margins**: **>95%**.

### Tier Packaging
* **Free Tier**: Manual tracking + 15 Copilot queries / month.
* **Pro Tier ($12/month)**:
  - Unlimited AI Copilot commands and queries
  - Automatic Gmail & job board sync
  - AI email generator & interviewer prep tool
  - Priority Google Calendar integration
