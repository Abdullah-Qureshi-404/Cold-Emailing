# Document 4: Database Design Document
## Cold Outreach AI Engine (Cold Email Platform)

---

### 4.1 Purpose & Scope
This document specifies the database structure for the **Cold Outreach AI Engine**. The database uses PostgreSQL (managed via SQLAlchemy ORM and Alembic migrations) to store campaigns, scraped leads, website research context, AI-generated email drafts, and execution/dispatch audit logs.

---

### 4.2 Entity Relationship Diagram (ERD)

```
 +------------------+           1:N           +------------------+
 |    campaigns     |------------------------<|      leads       |
 +------------------+                         +------------------+
 | PK id            |                         | PK id            |
 |    user_id       |                         | FK campaign_id   |
 |    name          |                         |    company_name  |
 |    niche         |                         |    email         |
 |    target_loc    |                         |    status        |
 |    daily_limit   |                         |    unsubscribed  |
 |    status        |                         +------------------+
 +------------------+                                  |
                                                       |
        +----------------------------------------------+----------------------------------------------+
        | 1:1                                          | 1:N                                          | 1:N
        v                                              v                                              v
+------------------+                   +------------------+                           +------------------+
|  lead_research   |                   |   email_drafts   |                           |    email_logs    |
+------------------+                   +------------------+                           +------------------+
| PK id            |                   | PK id            |                           | PK id            |
| FK lead_id (UQ)  |                   | FK lead_id       |--------------------------<| FK lead_id       |
|    comp_summary  |                   |    subject       |     1:N                   | FK email_draft_id|
|    tech_stack    |                   |    body          |                           |    gmail_thread_id|
|    site_score    |                   |    status        |                           |    status        |
+------------------+                   +------------------+                           +------------------+
```

---

### 4.3 Full Table Definitions

#### 1. Table: `campaigns`
* **Description:** Stores outreach target settings, ICP rules, and daily email rate limits.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique identifier for campaign. |
| `user_id` | `VARCHAR` | `NOT NULL` | Multi-tenant user / organization identifier. |
| `name` | `VARCHAR` | `NOT NULL` | Campaign title. |
| `niche` | `VARCHAR` | `NOT NULL` | Target industry / segment. |
| `target_location` | `VARCHAR` | `NOT NULL` | Geographic targeting filter. |
| `service_description`| `VARCHAR` | `NOT NULL` | Service/product value proposition. |
| `target_customer` | `VARCHAR` | `NOT NULL` | Target ICP buyer persona description. |
| `daily_limit` | `INTEGER` | `DEFAULT 50` | Maximum daily emails dispatched for campaign. |
| `status` | `ENUM` | `DEFAULT 'active'` | Campaign status (`active`, `paused`, `stopped`). |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp. |

* **Indexes:** `ix_campaigns_id` (`id`).

---

#### 2. Table: `leads`
* **Description:** Contains scraped/imported prospect companies and contact metadata.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique lead record identifier. |
| `campaign_id` | `INTEGER` | `FOREIGN KEY (campaigns.id)`, `NOT NULL` | Associated campaign reference. |
| `company_name` | `VARCHAR` | `NOT NULL` | Target company business name. |
| `contact_name` | `VARCHAR` | `NULLABLE` | Contact person full name. |
| `website` | `VARCHAR` | `NULLABLE` | Lead website URL. |
| `phone` | `VARCHAR` | `NULLABLE` | Business phone number. |
| `email` | `VARCHAR` | `NULLABLE` | Primary contact email address. |
| `source` | `VARCHAR` | `NULLABLE` | Lead origin (`google_maps`, `csv_import`). |
| `github_url` | `VARCHAR` | `NULLABLE` | GitHub repository/profile URL. |
| `twitter_url` | `VARCHAR` | `NULLABLE` | Twitter/X social profile URL. |
| `status` | `ENUM` | `DEFAULT 'found'` | Current pipeline status (see section 4.4). |
| `qualification_reason`| `VARCHAR` | `NULLABLE` | LLM justification for qualification state. |
| `unsubscribed` | `BOOLEAN` | `DEFAULT FALSE`, `NOT NULL` | Global opt-out safety flag. |
| `raw_data` | `JSON` | `NULLABLE` | Unstructured payload from scraper. |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp. |

* **Indexes:** `ix_leads_id` (`id`), `fk_leads_campaign_id` (`campaign_id`).

---

#### 3. Table: `lead_research`
* **Description:** Stores extracted website intelligence, technology footprints, and website audit scores.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique research record identifier. |
| `lead_id` | `INTEGER` | `FOREIGN KEY (leads.id)`, `UNIQUE`, `NOT NULL` | Associated lead reference. |
| `company_summary` | `TEXT` | `NULLABLE` | Summarized overview of core business offerings. |
| `company_description`| `TEXT` | `NULLABLE` | Detailed website body scraping summary. |
| `technologies` | `JSON` | `NULLABLE` | Array of detected tech stack items. |
| `pain_points` | `JSON` | `NULLABLE` | Array of identified technical issues / site flaws. |
| `research_status` | `VARCHAR` | `DEFAULT 'completed'` | Research job state (`completed`, `failed`). |
| `confidence_score` | `INTEGER` | `NULLABLE` | Overall AI confidence index (0-100). |
| `sources_used` | `JSON` | `NULLABLE` | Source URLs indexed during web crawling. |
| `website_quality_score`|`INTEGER`| `NULLABLE` | Objective site design/health score (0-100). |
| `website_issues` | `JSON` | `NULLABLE` | Specific UX or performance flaws detected. |
| `estimated_team_size`|`VARCHAR` | `NULLABLE` | ICP scale (`solo`, `small`, `medium`, `large`). |
| `icp_fit_score` | `INTEGER` | `NULLABLE` | Target customer alignment rating (0-100). |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp. |

* **Indexes:** `ix_lead_research_id` (`id`), `ix_lead_research_lead_id` (`lead_id`, UNIQUE).

---

#### 4. Table: `email_drafts`
* **Description:** Holds AI-generated subject lines and body copy awaiting user approval or automated queueing.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Draft record identifier. |
| `lead_id` | `INTEGER` | `FOREIGN KEY (leads.id)`, `NOT NULL` | Target lead reference. |
| `subject` | `VARCHAR` | `NULLABLE` | Generated email subject line. |
| `body` | `TEXT` | `NULLABLE` | Generated personalized email body copy. |
| `status` | `VARCHAR` | `DEFAULT 'pending'` | Draft review state (`pending`, `approved`, `rejected`). |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp. |

* **Indexes:** `ix_email_drafts_id` (`id`), `ix_email_drafts_lead_id` (`lead_id`).

---

#### 5. Table: `email_logs`
* **Description:** Audit trail recording sent emails, follow-up history, and Gmail thread IDs.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Log record identifier. |
| `lead_id` | `INTEGER` | `FOREIGN KEY (leads.id)`, `NOT NULL` | Recipient lead reference. |
| `email_draft_id` | `INTEGER` | `FOREIGN KEY (email_drafts.id)`, `NULLABLE` | Associated draft copy reference. |
| `gmail_thread_id` | `VARCHAR` | `NULLABLE` | Google Gmail conversation thread identifier. |
| `sent_at` | `TIMESTAMP` | `NULLABLE` | Precise dispatch timestamp. |
| `status` | `VARCHAR` | `DEFAULT 'pending'` | Dispatch status (`sent`, `failed`, `bounced`). |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp. |

* **Indexes:** `ix_email_logs_id` (`id`), `ix_email_logs_lead_id` (`lead_id`).

---

### 4.4 Data Dictionary & Pipeline Enums

#### Lead Status Lifecycle (`LeadStatus`)
1. `found`: Initial lead ingested via Google Maps or CSV.
2. `email_searching`: Email lookup task active.
3. `email_found`: Verified email attached to lead.
4. `email_not_found`: Email lookup failed.
5. `research_pending`: AI web research enqueued.
6. `research_complete`: Website crawling completed.
7. `qualified`: Met campaign target ICP criteria.
8. `disqualified`: Failed ICP criteria.
9. `email_generated`: AI copy generated.
10. `waiting_approval`: Pending human review.
11. `queued`: Scheduled for dispatch.
12. `sent`: Initial cold email dispatched.
13. `followup_1`: First follow-up dispatched.
14. `followup_2`: Second follow-up dispatched.
15. `replied`: Prospect replied.
16. `cold`: Non-responsive after complete sequence.

---

### 4.5 Migration Strategy
Database schemas are version-controlled using **Alembic**. Migration procedures:
1. Generate migration script: `alembic revision --autogenerate -m "description"`
2. Apply pending migrations: `alembic upgrade head`
3. Roll back migration: `alembic downgrade -1`
