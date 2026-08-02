# Cold Email Platform - API Testing Documentation

This document contains complete, ready-to-use API testing documentation for all available endpoints in the **FastAPI Cold Email Backend**. Frontend developers and API testers can directly copy-paste example request payloads and inspect expected success/error responses in Postman, Swagger, or Insomnia.

---

## 🌐 Server Base URL
```
http://localhost:8000
```

## 📋 Default Request Headers
```http
Content-Type: application/json
Accept: application/json
```

---

## 📊 Reference Data Models & Enums

### Campaign Status (`CampaignStatus`)
- `active`
- `paused`
- `stopped`

### Lead Pipeline Status (`LeadStatus`)
- `found` - Initial lead ingested from scraper/CSV
- `email_searching` - Email discovery task running
- `email_found` - Valid email discovered
- `email_not_found` - Email discovery failed
- `research_pending` - AI web research queued
- `research_complete` - AI web research finished
- `qualified` - Qualified by LLM for campaign targeting
- `disqualified` - Disqualified by LLM
- `email_generated` - AI email draft generated
- `waiting_approval` - Email draft pending manual review
- `queued` - Scheduled for email dispatch
- `sent` - Initial email sent via Gmail API
- `followup_1` - Follow-up #1 dispatched
- `followup_2` - Follow-up #2 dispatched
- `replied` - Lead replied to email sequence
- `cold` - Lead remained non-responsive after follow-ups

---

## 🧭 Endpoint Table of Contents

1. [GET /](#1-root--health-check) - Root / Health Check
2. [POST /campaigns/](#2-create-campaign) - Create New Campaign
3. [GET /campaigns/](#3-list-all-campaigns) - List All Campaigns
4. [PATCH /campaigns/{id}/start](#4-start-campaign) - Start Campaign
5. [PATCH /campaigns/{id}/pause](#5-pause-campaign) - Pause Campaign
6. [PATCH /campaigns/{id}/stop](#6-stop-campaign) - Stop Campaign
7. [GET /campaigns/{campaign_id}/dashboard](#7-get-campaign-dashboard-metrics) - Get Campaign Dashboard Metrics
8. [GET /campaigns/{campaign_id}/leads-summary](#8-get-campaign-leads-breakdown-summary) - Get Campaign Leads Breakdown Summary
9. [POST /leads/scrape/{campaign_id}](#9-scrape-leads-via-google-maps) - Scrape Leads via Google Maps
10. [POST /leads/import-free-outbound/{campaign_id}](#10-import-free-outbound-csv-leads) - Import Free Outbound CSV Leads
11. [POST /leads/find-emails/{campaign_id}](#11-find--verify-lead-emails) - Find & Verify Lead Emails
12. [POST /leads/research/{campaign_id}](#12-run-ai-lead-research) - Run AI Lead Research
13. [GET /leads/{campaign_id}/research-status](#13-get-lead-research-status--quality-metrics) - Get Lead Research Status & Quality Metrics
14. [POST /leads/qualify/{campaign_id}](#14-qualify-campaign-leads) - Qualify Campaign Leads
15. [POST /leads/write-emails/{campaign_id}](#15-write-personalized-ai-email-drafts) - Write Personalized AI Email Drafts
16. [GET /leads/{campaign_id}/email-drafts](#16-get-campaign-email-drafts) - Get Campaign Email Drafts
17. [POST /leads/send-emails/{campaign_id}](#17-send-campaign-initial-emails) - Send Campaign Initial Emails
18. [POST /leads/check-replies/{campaign_id}](#18-detect-lead-email-replies) - Detect Lead Email Replies
19. [PATCH /leads/approve-email/{lead_id}](#19-approve-email-draft) - Approve Email Draft
20. [POST /leads/send-followups/{campaign_id}](#20-send-follow-up-emails) - Send Follow-up Emails
21. [POST /leads/mark-cold/{campaign_id}](#21-mark-unresponsive-leads-as-cold) - Mark Unresponsive Leads as Cold

---

## 🛠️ API Endpoints Documentation

--------------------------------
API Name: Root / Health Check
Method: GET
Endpoint: /

Purpose: Verify that the FastAPI backend server is online and operational.

Authentication: None Required

Path Parameters: None

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Cold Email Platform Running"
}
```

Possible Error Responses:
```json
{
  "detail": "Internal server error occurred."
}
```

--------------------------------
API Name: Create New Campaign
Method: POST
Endpoint: /campaigns/

Purpose: Create a new cold outreach campaign with targeting parameters, niche, service description, customer profile, and daily send limits.

Authentication: None Required (Placeholder user_id: "temp_user")

Path Parameters: None

Query Parameters: None

Request Body:
```json
{
  "name": "SaaS AI Automation Campaign",
  "niche": "Software Companies",
  "target_location": "San Francisco, CA",
  "service_description": "AI Agent development and workflow automation services",
  "target_customer": "CTOs, VPs of Engineering, and Founders at Seed/Series A startups",
  "daily_limit": 50
}
```

Example Request:
```json
{
  "name": "SaaS AI Automation Campaign",
  "niche": "Software Companies",
  "target_location": "San Francisco, CA",
  "service_description": "AI Agent development and workflow automation services",
  "target_customer": "CTOs, VPs of Engineering, and Founders at Seed/Series A startups",
  "daily_limit": 50
}
```

Expected Success Response:
```json
{
  "id": 1,
  "user_id": "temp_user",
  "name": "SaaS AI Automation Campaign",
  "niche": "Software Companies",
  "target_location": "San Francisco, CA",
  "service_description": "AI Agent development and workflow automation services",
  "target_customer": "CTOs, VPs of Engineering, and Founders at Seed/Series A startups",
  "daily_limit": 50,
  "status": "active",
  "created_at": "2026-07-30T14:00:00.000000"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "body",
        "name"
      ],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

--------------------------------
API Name: List All Campaigns
Method: GET
Endpoint: /campaigns/

Purpose: Retrieve a list of all existing cold outreach campaigns stored in the database.

Authentication: None Required

Path Parameters: None

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
[
  {
    "id": 1,
    "user_id": "temp_user",
    "name": "SaaS AI Automation Campaign",
    "niche": "Software Companies",
    "target_location": "San Francisco, CA",
    "service_description": "AI Agent development and workflow automation services",
    "target_customer": "CTOs, VPs of Engineering, and Founders at Seed/Series A startups",
    "daily_limit": 50,
    "status": "active",
    "created_at": "2026-07-30T14:00:00.000000"
  }
]
```

Possible Error Responses:
```json
{
  "detail": "Database connection error."
}
```

--------------------------------
API Name: Start Campaign
Method: PATCH
Endpoint: /campaigns/{id}/start

Purpose: Update campaign status to "active" to permit lead processing and email dispatching.

Authentication: None Required

Path Parameters:
- id (integer, required): The unique identifier of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Campaign started"
}
```

Possible Error Responses:
```json
{
  "detail": "Campaign not found"
}
```

--------------------------------
API Name: Pause Campaign
Method: PATCH
Endpoint: /campaigns/{id}/pause

Purpose: Update campaign status to "paused" to suspend automated task processing.

Authentication: None Required

Path Parameters:
- id (integer, required): The unique identifier of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Campaign paused"
}
```

Possible Error Responses:
```json
{
  "detail": "Campaign not found"
}
```

--------------------------------
API Name: Stop Campaign
Method: PATCH
Endpoint: /campaigns/{id}/stop

Purpose: Update campaign status to "stopped" to permanently halt campaign execution.

Authentication: None Required

Path Parameters:
- id (integer, required): The unique identifier of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Campaign stopped"
}
```

Possible Error Responses:
```json
{
  "detail": "Campaign not found"
}
```

--------------------------------
API Name: Get Campaign Dashboard Metrics
Method: GET
Endpoint: /campaigns/{campaign_id}/dashboard

Purpose: Retrieve high-level analytics and performance metrics for a campaign including lead counts, email status tallies, replies, and calculated reply rates.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): The ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "campaign_id": 1,
  "campaign_name": "SaaS AI Automation Campaign",
  "status": "active",
  "total_leads": 120,
  "emails_sent": 45,
  "replies": 9,
  "reply_rate": 20.0,
  "qualified_leads": 30,
  "disqualified_leads": 5,
  "emails_generated": 40,
  "waiting_approval": 10,
  "research_complete": 50,
  "followups_sent": 15,
  "cold_leads": 3
}
```

Possible Error Responses:
```json
{
  "detail": "Campaign not found"
}
```

--------------------------------
API Name: Get Campaign Leads Breakdown Summary
Method: GET
Endpoint: /campaigns/{campaign_id}/leads-summary

Purpose: Retrieve exact breakdown count of leads across all 16 LeadStatus pipeline stages for a given campaign.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): The ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "found": 10,
  "email_searching": 0,
  "email_found": 15,
  "email_not_found": 2,
  "research_pending": 0,
  "research_complete": 25,
  "qualified": 20,
  "disqualified": 5,
  "email_generated": 15,
  "waiting_approval": 5,
  "queued": 0,
  "sent": 10,
  "followup_1": 5,
  "followup_2": 2,
  "replied": 4,
  "cold": 1
}
```

Possible Error Responses:
```json
{
  "detail": "Campaign not found"
}
```

--------------------------------
API Name: Scrape Leads via Google Maps
Method: POST
Endpoint: /leads/scrape/{campaign_id}

Purpose: Trigger Google Maps lead scraping as an asynchronous background Celery task. Dispatches `scrape_google_maps_task` to fetch leads matching query and location.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the target campaign.

Query Parameters:
- query (string, optional, default: "software company"): Business search query/keyword.
- location (string, optional, default: "New York"): Geographic search location.

Request Body: None

Example Request:
URL: `/leads/scrape/1?query=software%20company&location=New%20York`
(No Request Body)

Expected Success Response:
```json
{
  "message": "Google Maps scraping background task initiated",
  "task_id": "c1f7a83d-92e1-4560-a29d-478191cb88f1",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Import Free Outbound CSV Leads
Method: POST
Endpoint: /leads/import-free-outbound/{campaign_id}

Purpose: Trigger Free Outbound Agent CSV lead import as an asynchronous background Celery task (`import_free_outbound_task`).

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the target campaign.

Query Parameters:
- file_path (string, optional, default: null): Optional custom path to CSV file. Defaults to `../free_outbound_agent/leads.csv`.

Request Body: None

Example Request:
URL: `/leads/import-free-outbound/1`
(No Request Body)

Expected Success Response:
```json
{
  "message": "Free Outbound leads import background task initiated",
  "task_id": "d82ab91c-1234-4567-89ab-cdef01234567",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": "CSV file not found at D:\\cold-emailing\\free_outbound_agent\\leads.csv"
}
```

--------------------------------
API Name: Find & Verify Lead Emails
Method: POST
Endpoint: /leads/find-emails/{campaign_id}

Purpose: Dispatch background Celery task (`process_email_discovery_task`) to discover and verify email addresses for campaign leads currently in status `FOUND`.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Email discovery and verification background task initiated",
  "task_id": "e93bc02d-5678-90ab-cdef-1234567890ab",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Run AI Lead Research
Method: POST
Endpoint: /leads/research/{campaign_id}

Purpose: Trigger background Celery task (`process_lead_research_task`) for leads in status `EMAIL_FOUND`. Scrapes company websites, sends scraped text to Groq LLM, and stores structured research summaries in `lead_research`.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Research task queued",
  "task_id": "f04cd13e-6789-01bc-def2-34567890abcd",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Get Lead Research Status & Quality Metrics
Method: GET
Endpoint: /leads/{campaign_id}/research-status

Purpose: Retrieve overall research completion progress, count of insufficient data leads, and calculated average LLM confidence score for campaign leads.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "total_leads": 50,
  "researched": 42,
  "insufficient": 3,
  "average_confidence": 8.7
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Qualify Campaign Leads
Method: POST
Endpoint: /leads/qualify/{campaign_id}

Purpose: Dispatch background Celery task (`process_qualification_task`) for leads in status `RESEARCH_COMPLETE`. Uses Groq LLM to evaluate research data against target customer criteria and update status to `QUALIFIED` or `DISQUALIFIED`.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Qualification task queued",
  "task_id": "a12bc34d-5678-90ef-1234-567890abcdef",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Write Personalized AI Email Drafts
Method: POST
Endpoint: /leads/write-emails/{campaign_id}

Purpose: Trigger background Celery task (`process_email_writing_task`) for leads in status `QUALIFIED` to generate hyper-personalized outreach subject lines and email bodies using LLM intelligence.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Email writing task queued",
  "task_id": "b23cd45e-6789-01fa-2345-67890abcdef1",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Get Campaign Email Drafts
Method: GET
Endpoint: /leads/{campaign_id}/email-drafts

Purpose: Retrieve all generated email drafts (subject, body, status) associated with leads in a specific campaign.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
[
  {
    "lead_id": 10,
    "company_name": "Acme Software Corp",
    "subject": "Scaling AI Workflows at Acme Software Corp",
    "body": "Hi Alex,\n\nNoticed Acme Software Corp is expanding its automated engineering pipelines. We specialize in building custom AI agents...\n\nBest regards,\nJohn",
    "status": "pending"
  }
]
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Send Campaign Initial Emails
Method: POST
Endpoint: /leads/send-emails/{campaign_id}

Purpose: Trigger background Celery task (`process_email_sending_task`) to dispatch approved email drafts to eligible campaign leads via Gmail API.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Email sending task queued",
  "task_id": "c34de56f-7890-12ab-3456-7890abcdef12",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Detect Lead Email Replies
Method: POST
Endpoint: /leads/check-replies/{campaign_id}

Purpose: Trigger background Celery task (`process_reply_detection_task`) to scan Gmail inbox threads for incoming replies from leads with `SENT` status.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Reply detection task queued",
  "task_id": "d45ef67a-8901-23bc-4567-890abcdef123",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Approve Email Draft
Method: PATCH
Endpoint: /leads/approve-email/{lead_id}

Purpose: Manually approve a generated email draft for a lead. Updates draft status to "approved" and advances lead status from `WAITING_APPROVAL` to `EMAIL_GENERATED`.

Authentication: None Required

Path Parameters:
- lead_id (integer, required): The ID of the lead whose draft is being approved.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Email draft approved successfully",
  "lead_id": 10,
  "draft_id": 5,
  "status": "approved",
  "lead_status": "email_generated"
}
```

Possible Error Responses:
```json
{
  "detail": "Email draft not found for lead"
}
```

--------------------------------
API Name: Send Follow-up Emails
Method: POST
Endpoint: /leads/send-followups/{campaign_id}

Purpose: Dispatch background Celery task (`process_followup_task`) to send follow-up emails (`FOLLOWUP_1` or `FOLLOWUP_2`) to eligible unresponsive leads in campaign.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Follow-up task queued",
  "task_id": "e56fa78b-9012-34cd-5678-90abcdef1234",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Mark Unresponsive Leads as Cold
Method: POST
Endpoint: /leads/mark-cold/{campaign_id}

Purpose: Dispatch background Celery task (`process_mark_cold_task`) to evaluate lead interaction history and transition non-responsive leads to `COLD` status after sequence completion.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): ID of the campaign.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "message": "Mark cold task queued",
  "task_id": "f67ab89c-0123-45de-6789-01abcdef2345",
  "campaign_id": 1,
  "status": "queued"
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

--------------------------------
API Name: Reset Daily Lead Scraping Cache
Method: DELETE
Endpoint: /leads/reset-daily-cache/{campaign_id}

Purpose: Delete only today's imported leads and associated child records (email drafts, logs, research) for a target campaign to clear daily scrape cache.

Authentication: None Required

Path Parameters:
- campaign_id (integer, required): Target campaign ID.

Query Parameters: None

Request Body: None

Example Request:
(No Request Body)

Expected Success Response:
```json
{
  "deleted": 143,
  "message": "Today's cached leads removed."
}
```

Possible Error Responses:
```json
{
  "detail": [
    {
      "loc": [
        "path",
        "campaign_id"
      ],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

