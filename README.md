# 🏙️ Civic Sentinel — AI-Powered Municipal Grievance Redressal Platform

> **IBM SkillUp Hackathon** · *UrbaPlus / Crowd Civic AI Verification & Resolution System*

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange?logo=firebase)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google)](https://ai.google.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss)](https://tailwindcss.com)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Key Features](#key-features)
4. [System Architecture](#system-architecture)
5. [Role-Based Portals](#role-based-portals)
6. [AI Pipeline & API Layer](#ai-pipeline--api-layer)
7. [Data Model](#data-model)
8. [Tech Stack](#tech-stack)
9. [Project Structure](#project-structure)
10. [Getting Started](#getting-started)
11. [Environment Variables](#environment-variables)
12. [Known Gaps & Roadmap](#known-gaps--roadmap)

---

## Overview

**Civic Sentinel** is a full-stack smart-city web application that transforms passive civic grievance logging into an **active, intelligent, and transparent municipal infrastructure management ecosystem**.

Citizens photograph civic defects (potholes, garbage, water-logging, broken streetlights). A multimodal **Google Gemini AI** pipeline automatically classifies the issue, detects duplicates, routes to the correct department, and later verifies that repairs were genuinely completed — all with a tamper-evident audit trail and automated citizen email notifications.

---

## Problem Statement

| Pain Point | Current Reality | Civic Sentinel Solution |
|---|---|---|
| Delayed triage | Complex bureaucratic portals, no structure | AI auto-classification with department routing in seconds |
| Duplicate reports | Same pothole reported 20 times, flooding queues | Geospatial + Visual duplicate detection merges redundant tickets |
| Fraudulent closures | Field crews mark issues "Resolved" without repairs | AI-verified video/photo proof required before closure |
| No accountability | No audit trail, no SLA tracking | Immutable audit logs + SHA-256 event hashing |
| Language barrier | English-only portals | 7-language support (EN, HI, MR, TA, TE, GU, BN) |

---

## Key Features

### 🔐 Authentication & RBAC
- Email/password + **Google OAuth** sign-in
- **Three roles**: Citizen · Field Authority · Executive Admin
- Session persistence via Firebase Auth + localStorage
- Demo quick-login buttons for instant portal access

### 📱 Citizen Portal
- 📷 **Camera / photo upload** of civic defects
- 📍 **GPS auto-geolocation** with reverse-geocoded address
- 🤖 **AI auto-classification** — category, severity, department pre-filled
- 🚫 **Civic gatekeeper** — rejects selfies, pets, non-civic images
- 🔍 **Duplicate detection** — warns if same issue reported nearby
- 🗳️ **Community voting** — neighbours upvote/dispute reports
- 🏆 **Karma & Leaderboard** — points, levels, badge unlocks, citywide rankings
- 📬 **Notification inbox** — history of all status-change emails with HTML preview
- 🎙️ **Voice-to-text** description input (Hindi/English)
- 🌐 **7-language UI toggle**

### 👷 Field Authority Portal
- 📋 **Departmental work queue** — filtered by category, severity, status
- 🗺️ **Full issue detail** — GPS map, AI analysis, community votes
- 📹 **On-site 30s video recording** — geotagged proof-of-repair
- 🤖 **AI resolution verification** — Gemini compares before-photo vs after-video; requires ≥80% confidence
- 🔑 **PIN-protected status transitions** (6-digit 2FA)
- 📧 **Auto-email to citizen** on every status change

### 🛡️ Admin Command Centre
- 📜 **Security audit log** — chronological log of every login, change, override
- 👥 **User management** — view, role-change, revoke access (PIN-protected)
- 🏙️ **Citywide issue review** — list, search, flag, delete any ticket
- ⚠️ **Dispute flag management** — flag/unflag for investigation
- 🔧 **Admin status override** — force-change any ticket with auto-email

### 🤖 AI & API Layer
- `/api/analyze-issue` — Gemini 2.5-Flash multimodal image classification
- `/api/check-duplicates` — Haversine spatial + Gemini visual duplicate scoring
- `/api/verify-resolution` — Before/after comparison with confidence scoring
- `/api/notifications/send-status-email` — Branded HTML email dispatch + inbox fetch
- **Multi-model fallback**: 2.5-Flash → 2.0-Flash → 1.5-Flash → static fallback

---

## System Architecture

```
                        +----------------------------------+
                        |        Landing Page  /           |
                        |   Auth Modal · Demo Quick Login  |
                        +----------------+-----------------+
                                         |
                        +----------------+-----------------+
                        |     Firebase Authentication      |
                        |  Email/Pass · Google OAuth · RBAC|
                        +----+----------+----------+-------+
                             |          |          |
                    role=citizen   role=authority  role=admin
                             |          |          |
               +-------------+  +-------+----+  +-+------------+
               | Citizen Portal| |Authority   |  |Admin Command |
               |  /citizen     | |Portal      |  |Centre /admin |
               +------+--------+ |/authority  |  +--------------+
                      |          +------+-----+
                      |                 |
          +-----------+-----------+     +----------+
          |                       |                |
  /api/analyze-issue   /api/check-duplicates  /api/verify-resolution
  Gemini 2.5-Flash     Haversine + Gemini     Gemini Before/After
          |                       |                |
          +----------+------------+----------------+
                     |
              +------+-------+
              |   Firestore   |
              | issues/       |
              | users/        |
              | auditLogs/    |
              | emailNotif/   |
              +--------------+
                     |
     /api/notifications/send-status-email
          Nodemailer SMTP / Simulation
                     |
              Citizen Email Inbox 📬
```

---

## Role-Based Portals

```
CITIZEN PORTAL /citizen
├── Report Issue (Photo + GPS)
├── AI Auto-Fill (Category · Severity · Department)
├── Duplicate Check Modal
├── My Reports (Status Timeline)
├── Community Feed (Upvote / Dispute)
├── Karma & Badges
└── Notification Inbox

FIELD AUTHORITY PORTAL /authority
├── Work Queue (Filter by Dept · Severity)
├── Inspect Ticket (GPS · AI Analysis · Votes)
├── Record 30s Video Proof (Geotagged)
├── AI Verification (≥80% confidence required)
└── Update Status (PIN-protected 2FA)

ADMIN COMMAND CENTRE /admin
├── Audit Log Viewer (Filter: Success / Denied / PIN)
├── User Management (RBAC · Role Changes)
├── Citywide Issue Review (Flag · Delete · Override)
└── Dispute Management
```

---

## AI Pipeline & API Layer

### Issue Classification Flow
```
Citizen uploads photo
        ↓
POST /api/analyze-issue
        ↓
Gemini 2.5-Flash Vision
  - isCivicIssue (gatekeeper)
  - category (Roads / Waste / Water / Power)
  - severity (Low / Medium / High / Critical)
  - department (PWD / Sanitation / Water Board)
  - confidenceScore (0.0 - 1.0)
  - keyObservations[]
        ↓
Auto-fill form fields → Submit to Firestore
```

### Duplicate Detection Flow
```
New report submitted
        ↓
POST /api/check-duplicates
        ↓
Haversine filter → candidates within 250m
        ↓
Gemini visual + text similarity scoring
  overallScore = location(40%) + image(35%) + text(20%) + time(5%)
        ↓
overallScore ≥ 75 → DUPLICATE FOUND → merge as supporter
overallScore < 75 → NEW ISSUE → save to Firestore
```

### Resolution Verification Flow
```
Authority records 30s video on-site
        ↓
POST /api/verify-resolution
  - beforeImage (original citizen photo)
  - videoFrames[] (≥4 frames extracted)
  - authorityCoords (GPS at time of recording)
        ↓
Gemini compares before vs after
        ↓
confidence ≥ 80% → status = Resolved ✅
confidence < 80% → status = Resolution Failed ❌ → re-work
        ↓
Auto email dispatched to citizen
```

---

## Data Model

### Firestore Collections

**`/issues/{issueId}`**
```
ticketId, userId, userEmail, title, category, issueType,
severity, department, location{lat,lon,address},
imageUrl, aiAnalysis{}, status, upvotes, isDuplicate,
parentId, isEmergency, communityVotes[], resolutionProofUrl,
resolutionAiAudit{}, createdAt
```

**`/users/{userId}`**
```
email, role (citizen|authority|admin), department,
karmaPoints, verificationsCount, tier, badges[], createdAt
```

**`/auditLogs/{logId}`**
```
timestamp, userId, email, role, action, portal,
status (SUCCESS|DENIED|WARNING), details, deviceInfo
```

**`/emailNotifications/{notifId}`**
```
ticketId, recipientEmail, subject, previousStatus, newStatus,
status (delivered|simulated|failed), htmlBody, sentAt, dispatchMode
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), React 19 | SSR + client components, routing |
| **Language** | TypeScript 5.9 (Strict Mode) | Type-safe business logic |
| **Styling** | Tailwind CSS v4, Lucide React, Motion | Dark-palette UI, micro-animations |
| **Database** | Google Cloud Firestore | NoSQL document store for all collections |
| **Auth** | Firebase Authentication | Email/password + Google OAuth + role tokens |
| **AI** | Google Gemini 2.5-Flash (Multimodal) | Image classification, duplicate detection, resolution verification |
| **Email** | Nodemailer (SMTP / simulation) | Status-transition email dispatch with HTML templates |
| **i18n** | Custom Context-based Language Provider | EN · HI · MR · TA · TE · GU · BN |
| **Security** | SHA-256 audit hashing, PIN guards | Tamper-evident logs, protected admin actions |

---

## Project Structure

```
.
├── app/
│   ├── page.tsx                              # Landing page with auth modal
│   ├── layout.tsx                            # Root layout + LanguageProvider
│   ├── citizen/page.tsx                      # Citizen portal
│   ├── authority/page.tsx                    # Authority portal
│   ├── admin/page.tsx                        # Admin command centre
│   ├── presentation/page.tsx                 # Hackathon presentation deck
│   └── api/
│       ├── analyze-issue/route.ts            # Gemini image classification
│       ├── check-duplicates/route.ts         # Spatial + visual duplicate detection
│       ├── verify-resolution/route.ts        # AI resolution verification
│       └── notifications/
│           └── send-status-email/route.ts    # Email dispatch + inbox fetch
├── components/
│   ├── CitizenLeaderboard.tsx                # Karma leaderboard
│   ├── CivicLogo.tsx                         # Brand logo
│   └── CivicVideoWalkthrough.tsx             # Demo video embed
├── lib/
│   ├── firebase.ts                           # Firebase client SDK
│   ├── firebaseAdmin.ts                      # Firebase Admin SDK (server-side)
│   ├── audit.ts                              # Security event logging
│   ├── emailService.ts                       # Email generation + SMTP dispatch
│   ├── notifications.ts                      # Client notification helpers
│   ├── karmaService.ts                       # Points · levels · badges · leaderboard
│   └── LanguageContext.tsx                   # 7-language i18n provider
├── .env.example                              # Environment variable template
├── firebase-blueprint.json                   # Firestore schema docs
├── firestore.rules                           # Firestore security rules
└── PROGRESS.md                               # Feature completion tracker
```

---

## Getting Started

### Prerequisites
- Node.js 20+ or Bun
- Firebase project (Firestore + Authentication + Storage enabled)
- Google Gemini API key from [AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd urba-plus

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Fill in your keys in .env

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Quick-Login
The landing page has one-click demo buttons for each role — no account creation needed for evaluation.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_DATABASE_ID` | ✅ | Firestore database ID (`(default)` if unnamed) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✅ | Firebase Admin SDK service account JSON |
| `SMTP_HOST` | ⚠️ Optional | SMTP server (omit for simulation mode) |
| `SMTP_USER` | ⚠️ Optional | SMTP username / Gmail address |
| `SMTP_PASS` | ⚠️ Optional | SMTP password / Gmail app password |
| `APP_URL` | ⚠️ Optional | Base URL for email CTA links |

> If SMTP variables are omitted, notifications run in **simulation mode** — saved to Firestore but not delivered to real inboxes.

---

## Known Gaps & Roadmap

### Current Gaps
| Gap | Impact |
|---|---|
| SLA Analytics Dashboard (Admin tab empty) | High |
| SHA-256 tamper-proof audit chain | High |
| Firestore security rules (currently open) | High for production |
| Department auto-routing from user profile | Medium |

### Planned Enhancements
1. 🗺️ **Live Ward Heat Map** — Leaflet.js + OpenStreetMap pins by severity
2. 📊 **SLA Analytics Dashboard** — Charts on existing Firestore data
3. 📸 **Before/After Proof Wall** — Public gallery with citizen rating
4. 🔐 **SHA-256 Audit Chain** — Mini blockchain with Admin integrity verifier
5. 🤖 **Gemini Civic Assistant Chatbot** — Natural language queries on live ticket data
6. 📈 **Predictive Hotspot AI** — 30-day trend analysis for ward failure prediction
7. 🔔 **Web Push Notifications** — Service Worker-based mobile alerts

---

## 🏆 Hackathon Context

**Event:** IBM SkillUp Hackathon
**Project:** Civic Sentinel (UrbaPlus)
**Track:** Smart Cities · Municipal e-Governance · Multimodal AI
**Built with:** IBM Bob · Next.js · Firebase · Google Gemini AI

---

> *Civic Sentinel — Turning citizen complaints into accountable governance, powered by AI.*
