# Project Synopsis: Civic Sentinel
## AI-Powered Municipal Grievance Redressal & Verification Platform

---

### 1. Project Title & Overview
- **Project Name:** Civic Sentinel (Crowd Civic AI Verification & Redressal System)
- **Domain:** Smart Cities, Municipal e-Governance, Civic Technology, Multimodal AI & Computer Vision
- **Platform:** Full-Stack Web Application (Next.js 15, TypeScript, Tailwind CSS, Firebase Firestore & Authentication, Google Gemini Multimodal AI)

---

### 2. Introduction & Problem Statement
Rapid urbanization and aging civic infrastructure have created recurring challenges for municipal corporations, urban local bodies (ULBs), and citizens:
1. **Delayed Grievance Reporting & Triage:** Citizens struggle with complex bureaucratic portals or call centers. Reports lack structured categorization, precise GPS coordinates, and standardized severity indicators.
2. **Duplicate & False Reports:** Multiple citizens report the same pothole or garbage dump, flooding department queues and wasting public resources.
3. **Fraudulent or Premature Ticket Closures:** Field crews or contractors frequently mark civic complaints as "Resolved" without genuine physical repair, leading to loss of citizen trust and unaddressed hazards.
4. **Lack of Transparent Accountability:** Conventional grievance redressal mechanisms lack tamper-proof audit trails to evaluate departmental Service Level Agreements (SLAs), response times, and contractor performance.

**Civic Sentinel** solves these systemic challenges by deploying a **closed-loop, multimodal AI verification architecture** that automates issue classification, eliminates duplicates, validates repair authenticity using AI-analyzed video evidence, and guarantees transparency through immutable audit logging.

---

### 3. Objectives of the System
- **Instant Citizen Reporting:** Provide a single-screen or mobile-responsive interface for citizens to upload photos or voice descriptions of civic defects with automated GPS geolocation.
- **Automated AI Triage:** Leverage Google Gemini Multimodal Vision models to detect the issue type (pothole, water-logging, illegal waste dump, broken streetlight), assess hazard severity, and automatically route tickets to the correct municipal department.
- **Geospatial Duplicate Detection:** Proactively identify duplicate complaints within a configurable geographical radius using spatial distance and visual similarity algorithms.
- **AI-Powered Resolution Verification:** Require field authorities to upload geotagged resolution video/photo proofs that Gemini AI analyzes to confirm legitimate repair before a ticket can be closed.
- **Automated Citizen Email Notification Service:** Instantly trigger authoritative, branded municipal emails to citizens whenever their reported grievance transitions status (e.g., from *Submitted* to *In Progress* or *Resolved*), ensuring continuous transparency and real-time civic engagement.
- **Immutable Auditability:** Record every status modification, approval, and administrative intervention with cryptographic SHA-256 audit logs.
- **Inclusive Accessibility:** Support bilingual user interfaces (English & Hindi) to cater to diverse demographic groups.

---

### 4. System Architecture & Role-Based Portals

Civic Sentinel is engineered with a strict **Role-Based Access Control (RBAC)** architecture consisting of three dedicated portals:

```
                          +-------------------------------+
                          |     Authentication Portal     |
                          |  (Email/Pass, Google OAuth,   |
                          |   Role Credential Routing)    |
                          +---------------+---------------+
                                          |
                 +------------------------+------------------------+
                 |                                                 |
                 v                                                 v
   +---------------------------+                     +---------------------------+
   |      Citizen Portal       |                     |  Field Authority Portal   |
   | - Camera / Photo Upload   |                     | - Department Queue        |
   | - Instant GPS Geocoding   |                     | - Field Inspection        |
   | - Gemini Auto-Classifier  |                     | - Geotagged Video Proof   |
   | - Community Consensus     |                     | - Gemini AI Resolution    |
   | - Live Ticket Timeline    |                     |   Verification & Approval |
   +-------------+-------------+                     +-------------+-------------+
                 |                                                 |
                 +------------------------+------------------------+
                                          |
                                          v
                            +---------------------------+
                            |  Executive Admin Center   |
                            | - Citywide SLA Metrics    |
                            | - Department Performance  |
                            | - User Management (RBAC)  |
                            | - SHA-256 Audit Logs      |
                            | - Fraud Prevention        |
                            +---------------------------+
```

#### A. Citizen Portal (`/citizen`)
- **Smart Capture & Upload:** Citizens capture or upload pictures of municipal issues directly from camera or device storage.
- **GPS Coordinates & Address Resolution:** Automatically records precise latitude, longitude, and reverse-geocodes street/ward addresses.
- **AI Multimodal Analysis:** Automatically identifies defect category (e.g., *Roads & Potholes*, *Waste Management*, *Water Logging*, *Electrical Hazard*), assigns severity (*Low*, *Medium*, *High*, *Emergency*), and suggests the responsible municipal department.
- **Voice Grievance Input:** Speech recognition supporting localized citizen input.
- **Neighborhood Feed & Community Validation:** Allows nearby residents to upvote or confirm issues, preventing spam and measuring public impact.

#### B. Field Authority Portal (`/authority`)
- **Departmental Work Queue:** Real-time filtered feed displaying tickets assigned to the officer’s department (e.g., Public Works Department, Sanitation, Water Board).
- **Turn-by-Turn GPS Navigation:** Maps route from authority headquarters to the incident site with proximity validation.
- **Work Order Assignment:** Dispatch field technicians and contractors.
- **Video Resolution Proof:** Authorities record an on-site video/photo of the completed repair.
- **AI Resolution Verification (`/api/verify-resolution`):** Gemini analyzes before-and-after visual evidence to ensure the defect has indeed been rectified before authorizing ticket closure.

#### C. Executive Admin Command Center (`/admin`)
- **Citywide SLA & Analytics Dashboard:** Visualizes open vs. resolved tickets, average resolution turnaround time, and department efficiency.
- **Role & Access Governance:** Super-administrators can elevate or revoke user privileges across Citizen, Field Authority, and Admin roles.
- **Tamper-Evident Security Audit Logs:** Chronological event store documenting every login, status change, and ticket disposition, cryptographically hashed with SHA-256.
- **PIN-Protected Administrative Security:** Sensitive overrides require elevated PIN authorization.

---

### 5. Technical Specifications & Stack

| Layer | Technology | Function / Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router), React 19 | Server and client component rendering, high-performance page routing |
| **Language** | TypeScript (Strict Mode) | Type-safe business logic, robust interfaces, and build verification |
| **Styling & Design** | Tailwind CSS v4, Lucide React, Motion | High-contrast modern interface, dark palette, smooth micro-interactions |
| **Database** | Google Cloud Firestore | NoSQL document storage for users, tickets, community votes, and audit logs |
| **Authentication** | Firebase Authentication | Secure email/password and Google OAuth authentication with role tokens |
| **Artificial Intelligence** | Google Gemini 2.5/3.5 Flash Multimodal Vision | Multimodal image understanding, classification, severity scoring, resolution verification |
| **Backend API Layer** | Next.js Server-Side Route Handlers (`/api/*`) | Protected server proxy for Gemini API calls, preventing API key exposure |
| **Notification Service** | Nodemailer, SMTP Transport & REST Gateway | Event-driven status transition email dispatch with HTML templates & in-app inbox |
| **Security & Integrity** | SHA-256 Digesting & PIN Guards | Tamper-evident audit logging and protected administrative actions |
| **Internationalization** | Context-based Language Provider | Dynamic localized switching between English and Hindi (हिन्दी) |

---

### 6. AI Algorithms & Verification Workflow

1. **Defect Classification & Severity Assessment (`/api/analyze-issue`):**
   - The user's image is encoded as a base64 buffer and sent securely via a server-side route handler to Google Gemini.
   - Structured JSON prompt schemas force the model to output:
     - `isCivicIssue` (Boolean gatekeeper to filter out selfies, memes, or non-civic photos)
     - `category` (Pothole, Waste, Streetlight, Drainage, Water Leakage)
     - `severity` (Low, Medium, High, Critical)
     - `suggestedDepartment` (PWD, Sanitation, Electric Supply, Water Board)
     - `confidenceScore` (0.0 to 1.0)
2. **Duplicate Detection Algorithm (`/api/check-duplicates`):**
   - Computes Haversine distance between newly submitted coordinates and existing active tickets.
   - For nearby reports (< 50 meters), visually compares image features using Gemini vision embeddings to merge redundant complaints into a single master ticket with multiple citizen endorsements.
3. **Resolution Verification Engine (`/api/verify-resolution`):**
   - Takes the initial complaint image and compares it side-by-side with the authority's post-repair video/photo.
   - The AI evaluates whether the defect shown in the original image has been physically addressed (e.g., asphalt freshly laid over pothole, garbage cleared, light operational) and assigns a confidence percentage. If confidence is below 80%, the system flags it for manual supervisor review.

---

### 7. Novelty & Key Differentiators
1. **Zero-False-Reporting Gatekeeper:** Filters out non-civic images and spam before tickets enter government pipelines.
2. **Accountability via Proof-of-Resolution:** Eliminates paper-only resolutions by mandating AI-verified photographic/video evidence.
3. **Community Validation Layer:** Empowers neighboring citizens to corroborate problems and confirm whether repairs were executed satisfactorily.
4. **Resilient Offline Fallback:** Dual storage strategy ensuring uninterrupted workflow even when internet latency or Firestore connection fluctuates.

---

### 8. Conclusion & Future Scope
Civic Sentinel transforms passive grievance logging into an active, intelligent, and transparent urban infrastructure management ecosystem. By uniting citizens, field crews, and municipal commissioners on a unified platform powered by multimodal AI, it reduces civic resolution times, prevents fraudulent closures, and fosters civic participation.

**Future Enhancements:**
- IoT sensor integration for automated water pipe burst and trash bin level monitoring.
- WhatsApp Chatbot integration for low-bandwidth reporting.
- Autonomous drone survey integration for large-scale municipal road audits.
