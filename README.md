# Cold Outreach AI Engine
> Autonomous AI-Powered Lead Scraping, Enrichment, Research, & Cold Email Sequence Platform

---

## 5.1 Project Title & Tagline
* **Title:** Cold Outreach AI Engine
* **Tagline:** Next-Generation Autonomous Outbound Platform Powered by FastAPI, Celery, React, and Groq LLMs.

---

## 5.2 Overview & Description
The **Cold Outreach AI Engine** is an end-to-end B2B outbound automation system. It bridges the gap between raw lead generation and high-converting cold email delivery. By integrating real-time Google Maps scraping, web auditing, tech stack detection, LLM prospect qualification, personalized copy generation, and automated sequence execution via Gmail API, the platform delivers human-grade cold outreach at machine scale.

---

## 5.3 Key Features
* 🗺️ **Google Maps Scraper Integration:** Automated local business discovery using `gosom/google-maps-scraper`.
* 📥 **CSV Bulk Lead Importer:** Ingest pre-existing prospect datasets with instant schema validation.
* 🔎 **Email Discovery & Verification:** Automatic contact email extraction and verification routines.
* 🤖 **AI Web Research Agent:** Crawls target websites to calculate site quality scores, extract tech stacks, and detect business pain points.
* 🎯 **LLM Lead Qualification:** Evaluates scraped leads against ideal customer profile (ICP) guidelines using Groq LLMs.
* ✍️ **AI Copywriting & HITL Review:** Generates personalized subject lines and email copy with optional manual human approval workflows.
* 🚀 **Multi-Stage Email Sequences:** Automated dispatch of initial emails, Follow-up 1, Follow-up 2, and auto-marking non-responders as cold.
* 🛑 **Compliance & Opt-out Safety:** Automatic unsubscriber check before every email send.

---

## 5.4 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript) | Single Page Application built with Vite |
| **Styling & UI** | Tailwind CSS / Lucide Icons | Responsive modern design system |
| **Backend API** | Python 3.11 / FastAPI | High-performance async REST server |
| **Task Queue** | Celery + Redis | Asynchronous background processing & scheduling |
| **Database** | PostgreSQL 15 | Relational persistence for pipeline models |
| **ORM & Migrations** | SQLAlchemy + Alembic | DB abstractions & migration tracking |
| **AI / LLM Engine** | Groq API (Llama-3 / DeepSeek) | High-speed LLM inference for research & writing |
| **Scraper Agent** | `gosom/google-maps-scraper` | Dockerized Google Maps scraping engine |
| **Outreach API** | Gmail API / SMTP | Automated inbox dispatching & reply tracking |

---

## 5.5 Architecture Overview
```
+-------------------------------------------------------------------+
|                        React (Vite) Frontend                      |
+-------------------------------------------------------------------+
                                  | HTTP / REST API
                                  v
+-------------------------------------------------------------------+
|                        FastAPI Backend Server                     |
+-------------------------------------------------------------------+
          |                       |                      |
          v                       v                      v
  +---------------+       +---------------+      +---------------+
  |  PostgreSQL   |       | Redis Broker  |      |   Groq LLM    |
  |  (Database)   |       +---------------+      |  (Inference)  |
  +---------------+               |              +---------------+
                                  v
                          +---------------+
                          | Celery Worker |
                          +---------------+
                                  |
               +------------------+------------------+
               |                                     |
               v                                     v
   +-----------------------+             +-----------------------+
   |  Google Maps Scraper  |             |     Gmail API/SMTP    |
   |   (Docker Container)  |             |    (Dispatch/Reply)   |
   +-----------------------+             +-----------------------+
```

---

## 5.6 Prerequisites
Ensure the following software packages are installed on your machine:
* **Docker & Docker Compose:** Docker Desktop 4.20+ (`docker --version`)
* **Python:** Version 3.11 or higher (`python --version`)
* **Node.js:** Version 18.0 or higher (`node --version`)
* **Git:** Version 2.30+ (`git --version`)

---

## 5.7 Step-by-Step Installation Guide

### Option A: Quick Start via Docker (Recommended)

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Abdullah-Qureshi-404/Cold-Emailing.git
   cd Cold-Emailing
   ```

2. **Configure Environment Files:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Fill in Required Credentials in `backend/.env`:**
   Open `backend/.env` and insert your GROQ API key and Gmail credentials:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@postgres:5432/cold_email_db
   REDIS_URL=redis://redis:6379/0
   GROQ_API_KEY=your_groq_api_key_here
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=your_gmail_app_password
   ```

4. **Launch Application Stack:**
   ```bash
   docker compose up --build
   ```
   *The compose stack automatically executes `alembic upgrade head` before starting the API server.*

5. **Access Application:**
   * **Frontend Application:** `http://localhost:5173`
   * **Backend REST API Docs (Swagger):** `http://localhost:8000/docs`
   * **PostgreSQL Database:** `localhost:5432`

---

### Option B: Local Development Setup (Without Docker)

#### 1. Setup Backend:
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your PostgreSQL, Redis, and Groq keys

# Run database migrations
alembic upgrade head

# Launch development environment (FastAPI + Celery)
python run_dev.py
```

#### 2. Setup Frontend:
```bash
cd frontend

# Install node packages
npm install

# Configure environment
cp .env.example .env

# Run Vite dev server
npm run dev
```

---

## 5.8 Environment Variables Configuration Guide

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/cold_email_db` | PostgreSQL connection string. |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Redis instance connection string. |
| `GROQ_API_KEY` | Yes | `""` | API key obtained from Groq Console for LLM inference. |
| `GMAIL_USER` | Optional | `""` | Gmail sender address for email dispatch. |
| `GMAIL_APP_PASSWORD` | Optional | `""` | 16-character App Password generated from Google Security settings. |
| `VITE_API_BASE_URL` | Frontend | `http://localhost:8000` | FastAPI server URL exposed to React application. |

---

## 5.9 How to Start and Use the Application

### 1. Starting the Services
* Run `docker compose up --build` from the root directory.
* Confirm that containers for `backend`, `celery-worker`, `postgres`, `redis`, and `frontend` display status `running`.

### 2. Workflow Execution Steps
1. **Open Frontend:** Visit `http://localhost:5173` in your web browser.
2. **Create a Campaign:** Click **"New Campaign"**, enter your product/service details, target customer profile, and set daily limits.
3. **Ingest Leads:**
   * Click **"Scrape via Google Maps"** and enter target niche and location, OR
   * Click **"Import CSV"** to upload pre-gathered prospect files.
4. **Trigger Research & Qualification:** Click **"Run AI Research"**. The system executes website crawling and marks lead entries as `qualified` or `disqualified`.
5. **Generate & Review Email Copy:** Click **"Write AI Emails"**. Navigate to the **Email Drafts** tab to inspect, edit, and click **"Approve"** on generated emails.
6. **Start Campaign Dispatch:** Click **"Start Campaign"**. The background scheduler will automatically send initial emails and handle follow-up sequences.

---

## 5.10 API Reference Summary
* `GET /` — Health check endpoint.
* `POST /campaigns/` — Create new campaign.
* `GET /campaigns/` — List all campaigns.
* `POST /leads/scrape/{campaign_id}` — Trigger Google Maps lead scraper.
* `POST /leads/research/{campaign_id}` — Run AI web research agent.
* `POST /leads/write-emails/{campaign_id}` — Generate AI email copy.
* `PATCH /leads/approve-email/{lead_id}` — Approve draft for sending.
* `POST /leads/send-emails/{campaign_id}` — Trigger outbound email sending.
* *For complete interactive testing, navigate to `http://localhost:8000/docs`.*

---

## 5.11 Production Deployment Instructions
1. **Reverse Proxy:** Configure Nginx or Caddy with HTTPS (Let's Encrypt SSL) proxying to port 8000 (Backend) and port 5173 (Frontend).
2. **Database Backup:** Setup scheduled `pg_dump` cron jobs for PostgreSQL volume backups.
3. **Process Supervision:** Use Docker Compose in detached mode (`docker compose up -d`) with systemd service wrappers for auto-restart on system reboot.
4. **Monitoring:** Optional setup of Flower (`celery -A celery_app.celery_app flower`) to inspect task execution metrics.

---

## 5.12 Contributing Guidelines
1. Fork the repository and create a feature branch (`git checkout -b feature/amazing-feature`).
2. Adhere to Python PEP 8 formatting rules (`black`, `flake8`) and TypeScript linting (`eslint`).
3. Ensure all schema alterations include an Alembic migration (`alembic revision --autogenerate`).
4. Commit your changes (`git commit -m 'Add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`) and open a Pull Request.

---

## 5.13 License
Distributed under the **MIT License**. See `LICENSE` for details.

---

## 5.14 Contact & Support
* **Project Maintainer:** Abdullah Qureshi
* **GitHub Repository:** [https://github.com/Abdullah-Qureshi-404/Cold-Emailing](https://github.com/Abdullah-Qureshi-404/Cold-Emailing)
* **Issue Tracker:** [https://github.com/Abdullah-Qureshi-404/Cold-Emailing/issues](https://github.com/Abdullah-Qureshi-404/Cold-Emailing/issues)
