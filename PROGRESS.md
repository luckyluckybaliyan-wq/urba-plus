# UrbaPlus (Civic Sentinel) — Project Progress

**IBM SkillUp Hackathon Submission**
**Stack:** Next.js 15 · React 19 · TypeScript · Firebase · Gemini AI · Tailwind CSS v4

---

## Overall Completion: 75%

```
Core Platform     ████████████████████░░░░  82%
AI Features       ████████████████░░░░░░░░  68%
Analytics         ██████░░░░░░░░░░░░░░░░░░  25%
Security          ████████████░░░░░░░░░░░░  50%
Future Features   ░░░░░░░░░░░░░░░░░░░░░░░░   0%
```

---

## Part 1 — Currently Implemented Features

### 🔐 Authentication & Access Control

| Feature | Purpose | Status |
|---|---|---|
| Email / Password Sign Up & Sign In | Citizens and officers register and log in securely | ✅ 100% |
| Google OAuth | One-click sign in via Google account | ✅ 100% |
| Role-Based Access Control (RBAC) | Three roles: Citizen, Authority, Admin — each routed to their own portal | ✅ 100% |
| Session Persistence | Login state survives page refresh via localStorage + Firebase Auth | ✅ 100% |
| Demo Quick-Login | 1-click buttons for judges to enter any role instantly | ✅ 100% |

---

### 🌐 Landing Page

| Feature | Purpose | Status |
|---|---|---|
| Off-white minimal UI | Clean, professional first impression | ✅ 100% |
| Hero section with CTA | Explains the platform and drives sign-up | ✅ 100% |
| YouTube Demo Video Embed | Click-to-play demo video inline (no redirect) with thumbnail | ✅ 100% |
| How It Works (4-step grid) | Explains the AI pipeline to first-time visitors | ✅ 100% |
| Portal entry cards | Citizen / Authority / Admin portal descriptions with quick sign-in | ✅ 100% |
| Auth modal | Full sign-in + sign-up + Google OAuth + demo logins in a clean modal | ✅ 100% |

---

### 📱 Citizen Portal

| Feature | Purpose | Status |
|---|---|---|
| Photo capture (camera + upload) | Citizen takes or uploads a photo of the civic defect | ✅ 100% |
| GPS auto-geolocation | Records precise latitude/longitude automatically | ✅ 100% |
| AI issue classification (`/api/analyze-issue`) | Gemini AI identifies category, severity, department from the photo | ✅ 100% |
| Auto-fill form fields | Category, issue type, description, department pre-filled by AI | ✅ 100% |
| Civic issue gatekeeper | Rejects selfies, pets, non-civic images before they enter the system | ✅ 100% |
| Duplicate detection modal (`/api/check-duplicates`) | Spatial + visual scan — warns if same issue already reported nearby | ✅ 100% |
| Ticket submission to Firestore | Issue saved with ticketId, GPS, AI analysis, timestamp | ✅ 100% |
| Voice-to-text description | Hindi/English speech recognition to fill description field | ⚠️ 70% — initialized, UI button exists but transcription → field link needs testing |
| My Reports tab | Citizen's own tickets with status timeline, filter, delete | ✅ 100% |
| Explore / Neighbourhood Feed | All public issues in a searchable list | ✅ 100% |
| Community voting (Yes/No) | Nearby citizens corroborate or dispute a report | ✅ 100% |
| Email Notifications inbox | History of all status-change emails received, with HTML preview | ✅ 100% |
| Karma & Leaderboard | Points, levels, badge unlock, citywide ranking | ✅ 100% |
| Submission confirmation email | Auto-email sent to citizen when ticket is created | ✅ 100% |
| English / Hindi language toggle | Full bilingual UI support | ✅ 100% |

---

### 👷 Authority Portal

| Feature | Purpose | Status |
|---|---|---|
| Department work queue | Real-time list of tickets filtered by category, severity, status | ✅ 100% |
| Issue inspection modal | Full detail view: photo, GPS, AI analysis, community votes | ✅ 100% |
| On-site video recording (30s) | Authority records geotagged proof-of-repair video in the field | ✅ 100% |
| GPS location during recording | Records authority's field coordinates for location verification | ✅ 100% |
| AI resolution verification (`/api/verify-resolution`) | Gemini compares before photo vs after video frames; only passes if ≥80% confidence | ✅ 100% |
| Status transitions (PIN-protected) | Update ticket status with 6-digit PIN as 2FA | ✅ 100% |
| Citizen email notification on update | Auto-email dispatched whenever status changes | ✅ 100% |
| Audit log on every action | Every status change, PIN use, and decision is logged | ✅ 100% |
| Department filter (own dept only) | Authority sees issues relevant to their department | ⚠️ 60% — filter exists but dept not auto-assigned from user profile yet |

---

### 🛡️ Admin Command Centre

| Feature | Purpose | Status |
|---|---|---|
| Security audit log viewer | Chronological log of every login, status change, override | ✅ 100% |
| Audit log filter (Success/Denied/PIN) | Quickly surface security incidents | ✅ 100% |
| User management | View all users, change roles, revoke access | ✅ 100% |
| PIN-protected role changes | Sensitive RBAC changes require Admin PIN | ✅ 100% |
| Citywide issue review | List, search, flag, delete any civic ticket | ✅ 100% |
| Dispute flag management | Flag/unflag issues for investigation | ✅ 100% |
| Admin status override | Force-change any ticket status with email notification | ✅ 100% |
| SLA analytics dashboard | Metrics: open vs resolved, avg resolution time, dept efficiency | ❌ 0% — tab exists, completely empty |
| System configuration panel | SLA thresholds, alert settings, department routing rules | ❌ 0% — not started |

---

### 🤖 AI & API Layer

| Feature | Purpose | Status |
|---|---|---|
| `/api/analyze-issue` | Gemini 2.5-Flash multimodal classification of citizen photo | ✅ 100% |
| `/api/check-duplicates` | Spatial (Haversine) + visual (Gemini) duplicate scoring | ✅ 100% |
| `/api/verify-resolution` | Compares before photo + after video frames; passes/fails resolution | ✅ 100% |
| `/api/notifications/send-status-email` POST | Triggers branded HTML email on status change | ✅ 100% |
| `/api/notifications/send-status-email` GET | Fetches citizen's notification inbox from Firestore | ✅ 100% |
| Multi-model fallback | 2.5-Flash → 2.0-Flash → 1.5-Flash → safe static fallback | ✅ 100% |
| Structured JSON schema enforcement | Gemini always returns typed, validated JSON | ✅ 100% |

---

### 📧 Email Notification System

| Feature | Purpose | Status |
|---|---|---|
| SMTP delivery (Gmail / any provider) | Real email dispatch via nodemailer | ✅ 100% |
| Simulation fallback mode | If SMTP not configured, logs to Firestore instead of crashing | ✅ 100% |
| Status-specific HTML templates | Different banner colours and messages for each status | ✅ 100% |
| Plain-text fallback body | Email works even in clients that block HTML | ✅ 100% |
| Firestore notification persistence | Every email logged to `emailNotifications/` for the inbox | ✅ 100% |
| Delivery status tracking | `delivered` / `simulated` / `failed` stored per record | ✅ 100% |
| SMTP connection verify | Checks credentials before sending, fails clearly if wrong | ✅ 100% |
| Audit log on send | Notification dispatch recorded in audit trail | ✅ 100% |

---

### 🔧 Infrastructure & Developer

| Feature | Purpose | Status |
|---|---|---|
| `lib/firebaseAdmin.ts` shared module | Single source for Admin SDK init — no duplication | ✅ 100% |
| `lib/karmaService.ts` | Award points, calculate levels, unlock badges, fetch leaderboard | ✅ 100% |
| `lib/audit.ts` | Security event logging with localStorage + Firestore dual persistence | ✅ 100% |
| `lib/notifications.ts` | Client helper to trigger and fetch email notifications | ✅ 100% |
| `.env` fully configured | Firebase + SMTP + Gemini + app URL all set | ✅ 100% |
| Next.js 15.5.28 (patched) | Upgraded from 15.1.7 — CVE-2025-66478 security fix applied | ✅ 100% |

---

## Part 2 — Known Gaps (Needs Completion)

| Gap | What's Missing | Impact |
|---|---|---|
| **SLA Analytics Dashboard** | Admin tab is empty — no charts, no citywide metrics | High — IBM judges specifically look for governance dashboards |
| **SHA-256 Audit Hashing** | Mentioned in synopsis, not implemented — logs go to Firestore as plain text | High — breaks the "tamper-proof" claim |
| **Department auto-routing** | Authority's department not stored in user profile — they see all issues | Medium — queue is unfiltered |
| **Voice-to-text full integration** | Transcription → description field connection not fully wired | Medium |
| **Admin config tab** | No SLA thresholds, no alert config, no department mapping UI | Medium |
| **Firestore security rules** | All collections are `allow read, write: if true` — fully open | High for production |
| **Offline support** | No Service Worker, no retry queue for failed Firestore writes | Medium |

---

## Part 3 — Planned Features (National-Level Upgrades)

These are the features that would elevate the project from a strong MVP to a **national hackathon winner**.

| # | Feature | Purpose | Why It Wins |
|---|---|---|---|
| 1 | **🗺️ Live Ward Heat Map** | Interactive map showing all active issues as colored pins (red = Critical, green = Resolved) — uses Leaflet.js + OpenStreetMap, free, no API key needed. Data already in Firestore. | Visually shows the *scale* of civic problems. Makes the platform feel like a real smart-city command centre, not just a ticket app. Instant demo wow factor. |
| 2 | **📊 SLA Analytics Dashboard** | Admin charts: open vs resolved over time, avg resolution time per department, AI verification pass/fail rate, top issue categories. Uses Recharts + existing Firestore data. | IBM Smarter Cities judging specifically requires *evidence-based governance*. Shows the platform measures and improves itself. Fills the biggest current gap. |
| 3 | **📸 Before / After Proof Wall** | Public gallery of resolved issues showing the citizen's original report photo side-by-side with the authority's after-repair frame. Citizens rate resolution quality (1–5 stars). | Makes accountability *visible*. Perfect live demo: show a pothole reported and fixed with photo proof. Strongly differentiates from every other civic app. |
| 4 | **🔐 SHA-256 Tamper-Proof Audit Chain** | Every audit log entry gets a SHA-256 hash of its content + the previous entry's hash (mini blockchain). Admin "Verify Integrity" button checks the chain and shows ✅ or ❌. Uses browser-native `crypto.subtle`. | Fulfils the claim already in the synopsis. Shows enterprise-grade auditability — critical for government adoption. Judges from IBM enterprise background will recognise this immediately. |
| 5 | **🤖 Gemini Civic Assistant Chatbot** | Floating chat widget in citizen portal. Answers natural-language queries: *"Status of ticket #CS-2847?"*, *"How many potholes near me?"*, *"How do I report a water leak?"*. Gemini with function-calling on Firestore data. | Demonstrates Gemini used for *multi-turn reasoning with live data*, not just classification. No competing team will have this. Scores maximum on AI innovation axis. |
| 6 | **📈 Predictive Hotspot AI** | New admin panel section. Runs Gemini analysis over 30 days of resolved issues to predict which wards will have the next infrastructure failure. Outputs ranked hotspot list with confidence scores and recommended preventive actions. | Transforms the app from a *reactive complaint box* into a *predictive governance tool*. Exactly what IBM's Smarter Cities agenda promotes. Strong differentiator. |
| 7 | **🔔 Web Push Notifications** | Browser push notifications (Service Worker) so citizens get alerts on mobile even without checking email. Status change → instant notification on phone. Free, no third-party cost. | India-specific impact — reaches citizens who don't check email regularly. Shows digital inclusion thinking. Service Worker also enables basic offline support. |

---

## Summary Score Card

| Dimension | Current | After Planned Features |
|---|---|---|
| **Core Platform** | 82% | 95% |
| **AI Innovation** | 68% | 90% |
| **Analytics & Governance** | 25% | 85% |
| **Security & Integrity** | 50% | 90% |
| **UX & Presentation** | 80% | 92% |
| **India-Specific Impact** | 60% | 85% |
| **Overall** | **~75%** | **~90%** |

---

*Last updated: auto-generated from codebase audit*
*Project: UrbaPlus / Civic Sentinel — IBM SkillUp Hackathon*
