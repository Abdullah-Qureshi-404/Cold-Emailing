# Document 1: Product Requirements Document (PRD)
## Cold Outreach AI Engine (Cold Email Platform)

---

### 1.1 Executive Summary
The **Cold Outreach AI Engine** is an enterprise-grade, autonomous B2B cold outreach platform that streamlines lead discovery, automated email verification, deep AI web research, personalized email draft generation, and intelligent campaign execution. Powered by FastAPI, Celery, PostgreSQL, Redis, and React (Vite), the platform replaces manual sales development tasks with asynchronous multi-agent workflows. It allows agencies, SaaS companies, and sales teams to scale hyper-personalized outreach while keeping deliverability high and operating strictly within email compliance standards.

---

### 1.2 Product Vision & Goals
* **Vision:** Empower modern B2B growth teams to achieve 10x outreach productivity with hyper-contextualized AI personalization that mimics a seasoned human BDR.
* **Primary Goals:**
  * Automate lead ingestion from Google Maps and CSV imports.
  * Execute automated email verification and enrichment to keep bounce rates under 2%.
  * Perform deep website crawling and AI research to extract tech stacks, website quality scores, and pain points.
  * Generate high-converting, personalized cold email drafts subject to optional human-in-the-loop (HITL) approval.
  * Manage multi-stage follow-up sequences with reply detection and automatic unsubscribe compliance.

---

### 1.3 Target Users & Personas

| Persona | Role | Key Motivations | Main Pain Points |
| :--- | :--- | :--- | :--- |
| **Sales Director Sarah** | Agency Founder / VP Sales | High email deliverability, campaign ROI, team scale | Low response rates from generic templates, high BDR payroll |
| **Growth Marketer Mark** | BDR / SDR | Quick lead scraping, automated personalized drafting | Hours spent browsing lead websites, manual email drafting |
| **DevOps & IT Admin Dan** | Technical Lead | Reliable architecture, low API latency, strict CAN-SPAM compliance | Domain reputation burn, unmonitored bulk dispatching |

---

### 1.4 User Problems & Pain Points
1. **Generic Cold Emails:** Outbound emails lack specific context, resulting in open rates < 15% and reply rates < 1%.
2. **Time-Consuming Manual Research:** SDRs spend 10–15 minutes per prospect researching company details, tech stacks, and website issues.
3. **Email Deliverability & Spam Risk:** Sending emails to invalid addresses damages domain reputation and causes blacklisting.
4. **Disjointed Pipeline Tools:** Managing separate tools for scraping, enrichment, email drafting, sending, and reply tracking causes operational friction.

---

### 1.5 Core Features & Priorities

| Feature Module | Description | Priority |
| :--- | :--- | :--- |
| **Lead Scraping & Ingestion** | Google Maps scraping via Dockerized `gosom` + CSV import support. | **High** |
| **Email Verification & Discovery** | Automated email lookup and verification before campaign queueing. | **High** |
| **AI Web Research Agent** | Deep website scraping, team size estimation, tech stack detection, and website quality scoring. | **High** |
| **LLM Qualification Engine** | Automated filtering of leads based on ideal customer profile (ICP) criteria and target persona. | **High** |
| **AI Draft Writing & Approval** | Personalised email creation (Groq/Llama-3) with optional manual review workflow. | **High** |
| **Email Dispatch & Sequencing** | Multi-stage automated sending (Initial -> Follow-up 1 -> Follow-up 2 -> Mark Cold) with daily throttling. | **High** |
| **Reply & Unsubscribe Detection** | Gmail API inbox polling for incoming replies and instant CAN-SPAM opt-out handling. | **High** |
| **Analytics & Metrics Dashboard** | Real-time campaign dashboard tracking sent count, replies, bounce rates, and lead pipeline stage breakdowns. | **Medium** |
| **Multi-Campaign Management** | Isolated target profiles, niches, locations, and sending limits per campaign. | **Medium** |

---

### 1.6 Complete User Flow (Step-by-Step)
1. **Campaign Creation:** User creates a new campaign specifying niche, target location, target customer persona, service description, and daily send limit.
2. **Lead Ingestion:** User either starts a Google Maps location search or uploads a CSV list of prospective businesses.
3. **Email Discovery:** The backend celery worker verifies existing emails or runs discovery algorithms to obtain valid contact addresses.
4. **AI Deep Research:** Celery tasks scrape lead websites to extract summary descriptions, identify technology stacks, detect website flaws, and assign an ICP fit score.
5. **LLM Qualification:** Leads are marked as `qualified` or `disqualified` based on campaign rules, saving outreach credits for high-fit prospects.
6. **AI Email Draft Generation:** For qualified leads, Groq LLM generates bespoke initial emails and follow-ups referencing specific research findings.
7. **Human-in-the-Loop Review (Optional):** User previews drafts in the UI, edits content if desired, and clicks "Approve".
8. **Automated Dispatch:** Approved emails are queued and sent via Gmail API respecting daily send rate limits.
9. **Reply & Unsubscribe Monitoring:** Background jobs check for lead replies (updating status to `replied`) or opt-out requests (setting `unsubscribed=True`).
10. **Follow-Up & Mark Cold:** If no reply is detected after configured wait intervals, Follow-up 1 and Follow-up 2 are dispatched. Remaining non-responsive leads are set to `cold`.

---

### 1.7 Success Metrics (KPIs)
* **Email Verification Rate:** $\ge 95\%$ valid emails identified prior to dispatch.
* **Email Open Rate Target:** $\ge 45\%$.
* **Reply Rate Target:** $\ge 8\%$.
* **Domain Spam Rate:** $< 0.1\%$ bounce/complaint rate.
* **Pipeline Processing Speed:** $< 30$ seconds average execution time per lead for end-to-end research and draft generation.

---

### 1.8 Competitor Analysis

| Competitor | Key Strengths | Weaknesses | Our Key Advantage |
| :--- | :--- | :--- | :--- |
| **Instantly.ai** | Large account warmup network | Generic template tags, limited deep website auditing | Built-in AI web research agent checking site quality and tech stack. |
| **Lemlist** | Dynamic image personalization | Complex UI, expensive pricing tiers | Integrated Google Maps lead scraper & flexible open-architecture backend. |
| **Apollo.io** | Massive database contact list | Outdated contact emails, rigid sequencing rules | Real-time AI research verification & automated HITL email approval workflow. |
| **Clay.com** | Flexible data waterfall enrichment | High cost per table credit, steep learning curve | Native end-to-end pipeline (scraper -> AI research -> drafting -> sending) out-of-the-box. |

---

### 1.9 Unique Selling Points (USPs)
1. **Holistic AI Research Engine:** Evaluates website quality scores and technical pain points directly to build high-converting cold email hooks.
2. **Full Pipeline Automation:** Single-platform workflow spanning raw Google Maps lead harvesting to sent Gmail threads.
3. **Safety & Compliance First:** Automated unsubscriber suppression checks applied immediately before any dispatch action.
4. **Developer-Friendly & Modular:** Python FastAPI + Celery architecture supporting asynchronous background scalability.

---

### 1.10 Constraints & Assumptions
* **Constraints:**
  * Gmail API sending quotas (500 emails/day for standard Gmail, 2,000/day for Google Workspace).
  * Groq LLM API rate limits (tokens per minute).
  * Docker socket requirement for Google Maps container scraper (`gosom`).
* **Assumptions:**
  * Target lead websites are publicly accessible via HTTP/HTTPS.
  * Valid OAuth2 or App Password credentials are configured for Gmail SMTP API.
