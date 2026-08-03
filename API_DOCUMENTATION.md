# Document 3: API Documentation
## Cold Outreach AI Engine (Cold Email Platform)

---

### 3.1 Base URL
```http
http://localhost:8000
```

---

### 3.2 Authentication Method
* **Current Mode:** Development Placeholder Headers / Path Identifiers (`user_id: "temp_user"`).
* **Production Spec:** HTTP Bearer JSON Web Tokens (JWT) passed via `Authorization: Bearer <access_token>` header.

---

### 3.3 Standard Error Response Format
All error responses adhere to standard JSON error structures:
```json
{
  "detail": "Error description message explaining the failure cause."
}
```

Validation errors (HTTP 422) return Pydantic location arrays:
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

### 3.4 All API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/` | System Health Check |
| **POST** | `/campaigns/` | Create a new cold outreach campaign |
| **GET** | `/campaigns/` | List all active campaigns |
| **PATCH** | `/campaigns/{id}/start` | Start campaign |
| **PATCH** | `/campaigns/{id}/pause` | Pause campaign |
| **PATCH** | `/campaigns/{id}/stop` | Stop campaign |
| **GET** | `/campaigns/{campaign_id}/dashboard` | Fetch campaign performance KPIs |
| **GET** | `/campaigns/{campaign_id}/leads-summary` | Fetch campaign lead pipeline status breakdown |
| **POST** | `/leads/scrape/{campaign_id}` | Trigger Google Maps lead scraper task |
| **POST** | `/leads/import-free-outbound/{campaign_id}` | Import CSV leads |
| **POST** | `/leads/find-emails/{campaign_id}` | Trigger email discovery and verification task |
| **POST** | `/leads/research/{campaign_id}` | Trigger AI deep web research agent |
| **GET** | `/leads/{campaign_id}/research-status` | Retrieve lead research metrics & quality scores |
| **POST** | `/leads/qualify/{campaign_id}` | Qualify campaign leads using Groq LLM |
| **POST** | `/leads/write-emails/{campaign_id}` | Generate personalized AI email drafts |
| **GET** | `/leads/{campaign_id}/email-drafts` | Retrieve all pending/generated email drafts |
| **PATCH** | `/leads/approve-email/{lead_id}` | Approve generated email draft for dispatch |
| **POST** | `/leads/send-emails/{campaign_id}` | Dispatch queued initial cold emails |
| **POST** | `/leads/check-replies/{campaign_id}` | Poll inbox for incoming lead replies |
| **POST** | `/leads/send-followups/{campaign_id}` | Send scheduled sequence follow-ups |
| **POST** | `/leads/mark-cold/{campaign_id}` | Mark non-responsive leads as cold |
| **POST** | `/unsubscribe/{lead_id}` | Process opt-out request for lead |

---

### 3.5 Detailed Endpoint Specification

#### 1. System Health Check
* **URL:** `/`
* **Method:** `GET`
* **Description:** Verifies operational health of the FastAPI server.
* **Headers:** None required.
* **Request Body:** None.
* **Success Response (200 OK):**
  ```json
  {
    "message": "Cold Email Platform Running"
  }
  ```
* **Error Response (500 Internal Server Error):**
  ```json
  {
    "detail": "Internal server error occurred."
  }
  ```

---

#### 2. Create Campaign
* **URL:** `/campaigns/`
* **Method:** `POST`
* **Description:** Registers a new cold outreach campaign with targeting parameters.
* **Headers:** `Content-Type: application/json`
* **Request Body Schema:**
  * `name` (string, required): Campaign display title.
  * `niche` (string, required): Target industry or market sector.
  * `target_location` (string, required): Geographic focus area.
  * `service_description` (string, required): Value proposition offered in outreach.
  * `target_customer` (string, required): Description of Ideal Customer Profile (ICP).
  * `daily_limit` (integer, optional, default: 50): Maximum email dispatches per day.
* **Example Request:**
  ```json
  {
    "name": "B2B SaaS Automation Campaign",
    "niche": "Software Development",
    "target_location": "Austin, TX",
    "service_description": "AI agent workflow optimization and API engineering",
    "target_customer": "CTOs and VPs of Engineering at Seed to Series A startups",
    "daily_limit": 50
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": 1,
    "user_id": "temp_user",
    "name": "B2B SaaS Automation Campaign",
    "niche": "Software Development",
    "target_location": "Austin, TX",
    "service_description": "AI agent workflow optimization and API engineering",
    "target_customer": "CTOs and VPs of Engineering at Seed to Series A startups",
    "daily_limit": 50,
    "status": "active",
    "created_at": "2026-08-03T12:00:00.000000"
  }
  ```
* **Error Response (422 Unprocessable Entity):**
  ```json
  {
    "detail": [
      {
        "loc": ["body", "name"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```

---

#### 3. List All Campaigns
* **URL:** `/campaigns/`
* **Method:** `GET`
* **Description:** Returns all campaigns stored in database.
* **Headers:** `Accept: application/json`
* **Request Body:** None.
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "user_id": "temp_user",
      "name": "B2B SaaS Automation Campaign",
      "niche": "Software Development",
      "target_location": "Austin, TX",
      "service_description": "AI agent workflow optimization",
      "target_customer": "CTOs and Founders",
      "daily_limit": 50,
      "status": "active",
      "created_at": "2026-08-03T12:00:00.000000"
    }
  ]
  ```

---

#### 4. Trigger AI Lead Web Research
* **URL:** `/leads/research/{campaign_id}`
* **Method:** `POST`
* **Description:** Initiates Celery background worker to scrape and analyze target business websites for a campaign.
* **Path Parameters:** `campaign_id` (integer, required).
* **Request Body:** None.
* **Success Response (200 OK):**
  ```json
  {
    "message": "AI lead research task started for campaign 1",
    "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  {
    "detail": "Campaign not found"
  }
  ```

---

#### 5. Generate AI Email Drafts
* **URL:** `/leads/write-emails/{campaign_id}`
* **Method:** `POST`
* **Description:** Triggers Groq LLM to generate bespoke email copy for qualified campaign leads.
* **Path Parameters:** `campaign_id` (integer, required).
* **Request Body:** None.
* **Success Response (200 OK):**
  ```json
  {
    "message": "Email writing task queued for campaign 1",
    "task_id": "5f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c"
  }
  ```

---

#### 6. Approve Email Draft
* **URL:** `/leads/approve-email/{lead_id}`
* **Method:** `PATCH`
* **Description:** Manually approves an email draft to transition lead status from `waiting_approval` to `queued`.
* **Path Parameters:** `lead_id` (integer, required).
* **Request Body:** None.
* **Success Response (200 OK):**
  ```json
  {
    "message": "Email draft approved for lead 42",
    "status": "queued"
  }
  ```

---

#### 7. Lead Unsubscribe Endpoint
* **URL:** `/unsubscribe/{lead_id}`
* **Method:** `POST`
* **Description:** Opts out a recipient lead, enforcing immediate sending suppression.
* **Path Parameters:** `lead_id` (integer, required).
* **Request Body:** None.
* **Success Response (200 OK):**
  ```json
  {
    "message": "Lead unsubscribed successfully."
  }
  ```
