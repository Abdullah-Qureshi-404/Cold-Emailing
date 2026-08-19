# Document 2: Software Requirements Specification (SRS)
## Cold Outreach AI Engine (Cold Email Platform)

---

### 2.1 Introduction & Scope
This Software Requirements Specification (SRS) document details the functional, structural, and non-functional requirements for the **Cold Outreach AI Engine**. The system comprises a FastAPI REST backend, a Celery task queue runner backed by Redis, a PostgreSQL database, and a React (TypeScript + Vite) frontend interface. The system automates lead extraction, email verification, AI web research, lead qualification, personalized draft generation, and email dispatch.

---

### 2.2 System Architecture Overview
The system follows a modern decoupled architecture:
* **Presentation Layer:** React 18 single-page application built with Vite and Tailwind CSS.
* **API Gateway & App Layer:** FastAPI application exposing RESTful endpoints with OpenAPI schema definitions.
* **Asynchronous Task Queue:** Celery workers powered by Redis to execute long-running scraping, research, LLM generation, and email sending tasks.
* **Database & Persistence Layer:** PostgreSQL storing relational structures (`campaigns`, `leads`, `lead_research`, `email_drafts`, `email_logs`) managed via SQLAlchemy ORM and Alembic migrations.
* **External Integration Layer:** Docker-based `gosom` Google Maps scraper, Groq API (Llama 3/DeepSeek LLM), Google Gmail API / SMTP.

---

### 2.3 Functional Requirements

| Requirement ID | Module | Description | Priority |
| :--- | :--- | :--- | :--- |
| **FR-001** | Campaigns | System shall allow creation, updates, listing, starting, pausing, and stopping of cold outreach campaigns. | **High** |
| **FR-002** | Lead Ingestion | System shall support triggering Google Maps scraping tasks based on niche and location. | **High** |
| **FR-003** | Lead Ingestion | System shall support CSV file upload containing pre-collected lead information (`company_name`, `email`, `website`, `phone`). | **High** |
| **FR-004** | Email Discovery | System shall run verification routines on lead email addresses and assign statuses (`email_found`, `email_not_found`). | **High** |
| **FR-005** | AI Research | System shall crawl lead website URLs, extract company tech stacks, calculate a website quality score, and summarize business activities. | **High** |
| **FR-006** | Qualification | System shall query Groq LLM with campaign ICP criteria to qualify or disqualify lead records with a human-readable justification. | **High** |
| **FR-007** | Draft Generation | System shall automatically generate tailored subject lines and body copy for qualified leads using extracted research context. | **High** |
| **FR-008** | HITL Approval | System shall allow users to view, edit, and manually approve generated email drafts prior to dispatch. | **High** |
| **FR-009** | Email Dispatch | System shall send approved initial emails and follow-ups via Gmail API while observing configured daily limits per campaign. | **High** |
| **FR-010** | Reply Tracking | System shall check Gmail inbox threads to detect lead replies and mark lead status as `replied`. | **High** |
| **FR-011** | Unsubscribe Safety| System shall provide an opt-out endpoint (`POST /unsubscribe/{lead_id}`) and block any future dispatch to unsubscribed records. | **High** |
| **FR-012** | Analytics | System shall report aggregate campaign KPIs (total leads, qualified count, emails sent, reply count, conversion rates). | **Medium** |

---

### 2.4 Non-Functional Requirements

#### 2.4.1 Performance Requirements
* **API Response Time:** 95% of standard CRUD API requests shall respond within 200 ms.
* **Asynchronous Task Execution:** Scraping and research worker tasks shall run asynchronously without blocking API request threads.
* **Throughput:** Celery worker pipeline shall support processing up to 1,000 leads per hour per worker instance.

#### 2.4.2 Security Requirements
* **Data Transport:** All external API communications shall enforce TLS 1.3 encryption.
* **API Secrets Management:** Sensitive credentials (groq API keys, Gmail tokens, DB passwords) must be read strictly from environment variables or secure secret managers.
* **SQL Injection Prevention:** All database operations must use SQLAlchemy parameterized ORM queries.

#### 2.4.3 Usability Requirements
* **Responsive Frontend UI:** React UI must adjust dynamically across desktop and tablet screen dimensions.
* **Status Visibility:** Real-time visual progress indicators for long-running Celery background jobs.

#### 2.4.4 Reliability & Maintainability Requirements
* **Database Migrations:** Schema changes must be tracked and executable via Alembic (`alembic upgrade head`).
* **Task Retries:** Celery worker tasks must implement exponential backoff retry logic for transient network failures.

#### 2.4.5 Scalability Requirements
* **Containerized Deployment:** Docker Compose stack supporting horizontal scaling of background Celery workers.

---

### 2.5 User Roles & Permissions

| Role | Permissions | Access Scope |
| :--- | :--- | :--- |
| **Administrator** | Full access to create/update campaigns, trigger scrapes, manage email credentials, configure limits, and purge records. | System-wide |
| **Campaign Manager** | Create/manage assigned campaigns, trigger lead research, review/edit email drafts, and inspect campaign reports. | Workspace level |
| **SDR / Reviewer** | View campaign leads, inspect research output, and approve or request revisions on email drafts. | Campaign level |

---

### 2.6 System Use Cases

#### Use Case UC-01: Create Outbound Campaign
* **Actor:** Campaign Manager
* **Preconditions:** System is online and PostgreSQL database is accessible.
* **Main Flow:**
  1. User navigates to Campaigns screen and clicks "New Campaign".
  2. User enters Name, Niche, Target Location, Service Description, Target Customer Profile, and Daily Limit.
  3. User submits form.
  4. System validates inputs and stores record in `campaigns` table with `status="active"`.
* **Postconditions:** Campaign is ready to ingest leads.

#### Use Case UC-02: Trigger Google Maps Lead Scraping
* **Actor:** Campaign Manager
* **Preconditions:** Active campaign exists.
* **Main Flow:**
  1. User selects campaign and triggers Google Maps Scrape.
  2. FastAPI enqueues background Celery task `tasks.scrape_leads_task`.
  3. Celery invokes `gosom/google-maps-scraper` container or service.
  4. Extracted lead records are saved into `leads` table with `status="found"`.
* **Postconditions:** Ingested lead entries are available for email verification.

#### Use Case UC-03: Execute AI Lead Web Research
* **Actor:** System / Background Worker
* **Preconditions:** Lead has status `research_pending` or `email_found`.
* **Main Flow:**
  1. Worker fetches lead target website URL.
  2. HTTP client retrieves page DOM and extracts meta descriptions, tech stack footprints, and site headers.
  3. LLM engine evaluates site quality and identifies core business offerings.
  4. Research findings are written to `lead_research` table; lead status updates to `research_complete`.
* **Postconditions:** Structured research context is prepared for LLM qualification and email generation.

#### Use Case UC-04: Qualify Leads & Generate AI Email Drafts
* **Actor:** System / Background Worker
* **Preconditions:** Lead research is complete.
* **Main Flow:**
  1. System sends lead research + campaign service description to Groq LLM API.
  2. LLM determines qualification result (`qualified` or `disqualified`) with reason.
  3. For qualified leads, LLM generates tailored email Subject and Body text.
  4. Record created in `email_drafts`; lead status transitions to `waiting_approval`.
* **Postconditions:** Draft is stored and awaiting human review or automated queueing.

#### Use Case UC-05: Dispatch Cold Email Sequence
* **Actor:** System / Background Worker
* **Preconditions:** Lead has approved email draft and `unsubscribed=False`.
* **Main Flow:**
  1. Celery scheduler fetches queued leads respecting daily limit cap.
  2. System checks lead `unsubscribed` flag; aborts if `True`.
  3. System sends email via Gmail API / SMTP.
  4. Entry added to `email_logs` with Gmail thread ID; lead status updated to `sent`.
* **Postconditions:** Email is delivered and sequence timer started for follow-up evaluation.

---

### 2.7 External Interface Requirements
* **Groq API:** HTTP REST interface for Llama-3/DeepSeek inference (`https://api.groq.com/openai/v1/chat/completions`).
* **Google Maps Scraper:** Containerized Docker execution (`gosom/google-maps-scraper`) returning JSON data.
* **Gmail API / SMTP:** OAuth2 authenticated connection to send emails and inspect thread responses via Google Workspace.

---

### 2.8 System Constraints
* **Daily Sending Caps:** Soft limit enforced in software (`daily_limit`), hard limit dictated by Gmail API (500/day personal, 2,000/day Workspace).
* **LLM Rate Limits:** Rate-limiting queues implemented in Celery tasks to avoid Groq 429 errors.
* **Docker Dependency:** Container socket access required if running scraper tasks inside backend container.

---

### 2.9 Assumptions & Dependencies
* Redis instance running on port 6379 for task message broker functionality.
* PostgreSQL 15+ database service accessible by backend.
* Web scraper target sites permit standard HTTP GET indexing requests.
