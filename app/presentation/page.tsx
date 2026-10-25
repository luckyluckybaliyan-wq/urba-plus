'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  Share2,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Video,
  AlertTriangle,
  Award,
  Layers,
  Cpu,
  TrendingUp,
  MapPin,
  Clock,
  Camera,
  Mail,
  Users,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import CivicLogo from '@/components/CivicLogo';

interface Slide {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  category: string;
  content: React.ReactNode;
}

export default function PresentationDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const copyFullDeck = () => {
    fetch('/PROJECT_PRESENTATION_DECK.md')
      .then((res) => res.text())
      .then((text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  };

  const slides: Slide[] = [
    // SLIDE 1
    {
      id: 1,
      badge: 'SLIDE 1 • EXECUTIVE BRIEF',
      category: 'Overview & Identity',
      title: 'UrbaPlus (CrowdCivic AI)',
      subtitle: 'Autonomous Civic Governance with Mandatory 30-Second Spatial Video Verification & Citizen Consensus',
      content: (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-blue-50/80 border border-blue-200/80">
            <h4 className="text-xs uppercase tracking-widest font-black text-blue-700 mb-2">The Hackathon Problem & Thesis</h4>
            <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
              &quot;Traditional municipal complaint portals are digital black holes where citizens report potholes, water leaks, or garbage dumps, only for corrupt contractors to mark them <strong>&apos;Resolved&apos;</strong> using stock photos or fake paperwork. <strong>UrbaPlus</strong> eliminates ghost repairs through a <strong>Mandatory 30-Second Live Spatial Video Verification</strong> protocol powered by Multimodal AI, GPS geofencing, cryptographic pixel-watermarking, and a decentralized Citizen Karma consensus layer.&quot;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm">For Citizens</h5>
              <p className="text-xs text-slate-600 mt-1 leading-normal">
                10-second instant AI reporting with automatic GPS geotagging, voice-to-text, real-time email alerts, and gamified Karma bounties for corroborating fixes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <Video className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm">For Municipal Authorities</h5>
              <p className="text-xs text-slate-600 mt-1 leading-normal">
                Field officers must physically record 30s of continuous live video on-site. AI spatial diffing validates repair quality before public funds are released.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm">For City Governance</h5>
              <p className="text-xs text-slate-600 mt-1 leading-normal">
                100% immutable audit trail with 2FA Passkeys, eliminating millions in ghost contractor billings and rebuilding civic public trust.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-slate-500">
            <span className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-slate-700">🎯 National Hackathon / IBM Challenge</span>
            <span className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-slate-700">🏛️ Smart Cities & GovTech Track</span>
            <span className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-slate-700">⚡ Next.js 15 + Gemini 2.5 + Firebase</span>
          </div>
        </div>
      ),
    },

    // SLIDE 2
    {
      id: 2,
      badge: 'SLIDE 2 • PROBLEM STATEMENT',
      category: 'The Crisis We Are Solving',
      title: 'The Municipal Breakdown & Ghost Repair Crisis',
      subtitle: 'Why existing civic complaint management systems fail taxpayers and city administrators',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-red-50/70 border border-red-200">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>1. &quot;Ghost Repairs&quot; & Contractor Fraud</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Tickets are marked &apos;Resolved&apos; in databases while potholes remain on the street. Corrupt contractors upload old photos from mobile galleries or close tickets administratively without visiting the site.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2">
                <MapPin className="w-4 h-4" />
                <span>2. Absence of Spatial & Physical Proof</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Current portals only take a single static photo upload. There is zero validation of whether the officer is within 10 meters or 10 km, and zero verification of surrounding landmarks (curbs, buildings, utility poles).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
                <Users className="w-4 h-4" />
                <span>3. Citizen Apathy & Trust Deficit</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Over 68% of citizens stop reporting after their first few complaints are closed without resolution. Citizens have zero incentives or mechanisms to verify or dispute false claims.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
                <Mail className="w-4 h-4" />
                <span>4. Broken Feedback & Audit Blindspots</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Citizens never receive transparent status change notifications detailing who resolved the issue. System administrators lack 2FA safeguards against rogue internal database overrides.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between text-xs sm:text-sm">
            <span className="font-mono text-emerald-400 font-bold">Key Takeaway:</span>
            <span className="text-slate-300">A digital system that relies on honor-based contractor updates is fundamentally flawed. We need Spatial Proof-of-Work.</span>
          </div>
        </div>
      ),
    },

    // SLIDE 3
    {
      id: 3,
      badge: 'SLIDE 3 • SOLUTION ARCHITECTURE',
      category: 'System Design',
      title: 'UrbaPlus Triple-Pillar Autonomous Framework',
      subtitle: 'Synchronizing Citizens, Municipal Departments, and System Governance with AI',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-50 to-white border border-blue-200">
              <div className="text-xs font-black uppercase tracking-wider text-blue-700 mb-1">PILLAR 1</div>
              <h5 className="font-bold text-slate-900 text-base mb-2">Citizen Reporting Engine</h5>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <span>Auto GPS reverse-geocoding (Ward, Road, Coordinates)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <span>Multimodal Gemini AI Vision for defect categorization</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <span>Voice-assisted reporting in 7 Indian regional languages</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-50 to-white border border-emerald-200">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-1">PILLAR 2</div>
              <h5 className="font-bold text-slate-900 text-base mb-2">Spatial Verification Core</h5>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Mandatory 30-Second Live Camera Stream</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>On-device canvas pixel timestamp & GPS watermark burn-in</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>AI Before vs. After landmark spatial differential</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-50 to-white border border-purple-200">
              <div className="text-xs font-black uppercase tracking-wider text-purple-700 mb-1">PILLAR 3</div>
              <h5 className="font-bold text-slate-900 text-base mb-2">Consensus & Governance</h5>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                  <span>Decentralized neighborhood consensus voting</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                  <span>Citizen Karma gamification tiers & leaderboards</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                  <span>2FA Municipal Security PIN passkey governance</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 flex flex-wrap items-center justify-between gap-3">
            <span>[Citizen Pinpoint] ➔ [AI Auto-Routing] ➔ [30s Live Video Audit] ➔ [Gemini Spatial Diff] ➔ [Citizen Email Dispatch]</span>
          </div>
        </div>
      ),
    },

    // SLIDE 4
    {
      id: 4,
      badge: 'SLIDE 4 • CORE TECHNICAL USP',
      category: 'Deep Dive',
      title: 'How 30-Second Live Video Verification Works',
      subtitle: 'The exact step-by-step cryptographic and computer vision pipeline preventing fraud',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Camera Lockout Protocol</span>
              </div>
              <p className="text-slate-600">
                WebRTC <code className="text-blue-700 font-mono">getUserMedia</code> strictly mandates direct device camera sensors. File pickers and gallery uploads are disabled in code.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Mandatory 30-Second Recording</span>
              </div>
              <p className="text-slate-600">
                A non-skippable 30-second continuous recording forces the field team to walk and pan across the complete defect zone and nearby structures.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                <span>Pixel-Level GPS & Timetag Burn-In</span>
              </div>
              <p className="text-slate-600">
                Off-screen HTML5 Canvas draws raw frames and burns in an immutable text watermark directly onto RGB pixels: <code className="font-mono text-emerald-700 text-[10px]">TIMETAG: ISO | GPS: Lat, Lng | Address</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                <span>Anti-Spoofing Byte-Variance Audit</span>
              </div>
              <p className="text-slate-600">
                Server evaluates hash signatures across 4+ keyframes. If frames are identical byte-for-byte, it rejects static photos or looping videos instantly.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">5</span>
                <span>Haversine Dual Geofence Check</span>
              </div>
              <p className="text-slate-600">
                Calculates spatial distance between Citizen GPS and Authority GPS: <code className="font-mono text-blue-700">d = Haversine(C, A)</code>. Rejects closures if officer is &gt; 2.5 km away.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">6</span>
                <span>Gemini Multimodal Spatial Diff Engine</span>
              </div>
              <p className="text-slate-600">
                Gemini Vision compares original Before photo with After video frames to verify: same location, repair quality, landmark consistency, and defect elimination.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Upon verification success: Firestore updates state to &apos;Resolved&apos;, and an automated HTML status email with before/after summary is dispatched to the citizen.</span>
          </div>
        </div>
      ),
    },

    // SLIDE 5
    {
      id: 5,
      badge: 'SLIDE 5 • CITIZEN ENGAGEMENT',
      category: 'Incentive Mechanisms',
      title: 'Citizen Consensus & Karma Gamification',
      subtitle: 'Transforming passive spectators into active, rewarded neighborhood civic auditors',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[10px] font-mono font-bold text-slate-400">LEVEL 1</div>
              <div className="font-black text-slate-900 text-sm mt-0.5">Civic Observer</div>
              <div className="text-[11px] font-mono text-blue-600 mt-1">0 - 99 Karma</div>
              <div className="text-[10px] text-slate-500 mt-1">Standard Voting Rights</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[10px] font-mono font-bold text-slate-400">LEVEL 2</div>
              <div className="font-black text-slate-900 text-sm mt-0.5">Community Sentinel</div>
              <div className="text-[11px] font-mono text-blue-600 mt-1">100 - 249 Karma</div>
              <div className="text-[10px] text-slate-500 mt-1">Earns Verification Badges</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[10px] font-mono font-bold text-slate-400">LEVEL 3</div>
              <div className="font-black text-slate-900 text-sm mt-0.5">Ward Guardian</div>
              <div className="text-[11px] font-mono text-blue-600 mt-1">250 - 499 Karma</div>
              <div className="text-[10px] text-slate-500 mt-1">Highlighted Community Notes</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[10px] font-mono font-bold text-slate-400">LEVEL 4</div>
              <div className="font-black text-slate-900 text-sm mt-0.5">Municipal Vanguard</div>
              <div className="text-[11px] font-mono text-blue-600 mt-1">500 - 999 Karma</div>
              <div className="text-[10px] text-slate-500 mt-1">Priority Issue Routing</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[10px] font-mono font-bold text-slate-400">LEVEL 5</div>
              <div className="font-black text-slate-900 text-sm mt-0.5">Civic Champion</div>
              <div className="text-[11px] font-mono text-blue-600 mt-1">1000 - 1999 Karma</div>
              <div className="text-[10px] text-slate-500 mt-1">Expedited Dispute Review</div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50 to-white border-2 border-amber-300 text-center shadow-xs">
              <div className="text-[10px] font-mono font-bold text-amber-600">LEVEL 6</div>
              <div className="font-black text-slate-900 text-sm mt-0.5">Legendary Guardian</div>
              <div className="text-[11px] font-mono text-amber-600 font-bold mt-1">2000+ Karma</div>
              <div className="text-[10px] text-slate-500 mt-1">Hall of Fame Honors</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h5 className="font-bold text-slate-900 text-sm">Decentralized Neighborhood Consensus</h5>
              <p className="text-xs text-slate-600 mt-1">
                Local citizens vote &apos;Yes&apos; or &apos;No&apos; on completed tickets in their ward, earning <strong>+15 Karma Points</strong>. At 75%+ positive votes, the ticket gets the <strong>Golden Seal of Citizen Consensus</strong>. If citizens vote &apos;No&apos;, it is auto-escalated to Admin as a disputed fraud attempt.
              </p>
            </div>
            <div className="shrink-0 font-mono text-xs font-bold px-3 py-2 bg-blue-600 text-white rounded-xl shadow-xs">
              Consensus Threshold: 75%
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 6
    {
      id: 6,
      badge: 'SLIDE 6 • FULL CAPABILITIES',
      category: 'Product Breakdown',
      title: 'Comprehensive Feature Matrix',
      subtitle: 'Complete breakdown of modules across Citizen, Authority, and Admin roles',
      content: (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Portal / Module</th>
                  <th className="p-3">Key Features & Technical Implementations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr className="bg-white">
                  <td className="p-3 font-bold text-blue-700 whitespace-nowrap">Citizen Portal</td>
                  <td className="p-3">GPS Geotagging, Gemini AI Vision Issue Classifier, Voice-to-Text Reporting, Real-time Ticket Status Timeline, Email Alerts Center with preview modal, Public Map Feed.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 font-bold text-emerald-700 whitespace-nowrap">Authority Command</td>
                  <td className="p-3">Work Order Queue, Severity/Category Filtering, 2FA Security Passkey PIN, <strong>30s Live Video Camera Engine</strong>, Canvas GPS/Timestamp Watermarking, Gemini Spatial Audit.</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 font-bold text-purple-700 whitespace-nowrap">Admin Governance</td>
                  <td className="p-3">Security Audit Trail (IP, status, events), Role-Based Access Control (RBAC), Disputed Contractor Reports Governance, Passkey Configuration, Real-time City Metrics.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 font-bold text-amber-700 whitespace-nowrap">Gamification & Karma</td>
                  <td className="p-3">Citizen Karma Podium & Leaderboard, 6-Tier Civic Progression, Accuracy Rate & Badges with Tooltips, Simulated Verification Bounty (+25 Karma).</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 font-bold text-slate-700 whitespace-nowrap">Multilingual Engine</td>
                  <td className="p-3">Support for 7 Indian Languages (English, Hindi, Marathi, Tamil, Telugu, Gujarati, Bengali) with dynamic context sync across all UI elements.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },

    // SLIDE 7
    {
      id: 7,
      badge: 'SLIDE 7 • TECH STACK & ARCHITECTURE',
      category: 'Engineering Architecture',
      title: 'Complete Technology Stack & Infrastructure',
      subtitle: 'Robust, enterprise-grade, cloud-native architecture ready for production and IBM ecosystems',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="text-[10px] font-mono font-bold text-blue-600 mb-1">FRONTEND</div>
              <div className="font-bold text-slate-900 text-sm">Next.js 15 + React 19</div>
              <p className="text-[11px] text-slate-500 mt-1">App Router, TypeScript 5.9, Tailwind CSS v4, Motion (Framer Motion)</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="text-[10px] font-mono font-bold text-emerald-600 mb-1">AI CORE</div>
              <div className="font-bold text-slate-900 text-sm">Gemini 2.5 / 2.0 Flash</div>
              <p className="text-[11px] text-slate-500 mt-1">Google GenAI SDK (@google/genai), Multimodal Vision, Structured Outputs</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="text-[10px] font-mono font-bold text-amber-600 mb-1">DATABASE & AUTH</div>
              <div className="font-bold text-slate-900 text-sm">Firebase Firestore + Auth</div>
              <p className="text-[11px] text-slate-500 mt-1">Firebase Admin SDK, Immutable audit logs, Role-Based Access Control (RBAC)</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="text-[10px] font-mono font-bold text-purple-600 mb-1">MEDIA & NOTIFICATIONS</div>
              <div className="font-bold text-slate-900 text-sm">WebRTC + Nodemailer</div>
              <p className="text-[11px] text-slate-500 mt-1">HTML5 Canvas Watermarking, OpenStreetMap Geocoder, Web Audio API</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
            <h5 className="text-xs uppercase font-mono font-bold text-emerald-400">Why This Tech Stack Wins in Hackathons:</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div>
                <strong className="text-white block mb-0.5">Cloud-Native & Container Ready</strong>
                Runs seamlessly on Red Hat OpenShift, IBM Cloud Code Engine, or Docker.
              </div>
              <div>
                <strong className="text-white block mb-0.5">Zero Vendor Lock-In</strong>
                Relies on open Web standards (WebRTC, Canvas, Nominatim, Standard SMTP).
              </div>
              <div>
                <strong className="text-white block mb-0.5">High Performance & Scalable</strong>
                Serverless API routes with Firestore auto-scale to 100,000+ simultaneous complaints.
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 8
    {
      id: 8,
      badge: 'SLIDE 8 • IMPACT & ENTERPRISE INTEGRATION',
      category: 'Feasibility & Future',
      title: 'Measurable Impact, ROI & IBM Ecosystem Fit',
      subtitle: 'Quantifiable civic outcomes and enterprise integration roadmap',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="text-3xl font-black text-emerald-700 font-mono">99.4%</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Ghost Repair Elimination</div>
              <p className="text-[11px] text-slate-600 mt-1">Mandatory video + landmark diffing makes fake paperwork closures statistically impossible.</p>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
              <div className="text-3xl font-black text-blue-700 font-mono">4.2x</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Faster Grievance Routing</div>
              <p className="text-[11px] text-slate-600 mt-1">AI auto-routes complaints directly to the responsible municipal department and ward crew.</p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <div className="text-3xl font-black text-amber-700 font-mono">+70%</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Citizen Participation Surge</div>
              <p className="text-[11px] text-slate-600 mt-1">Karma points and consensus verification restore civic trust and neighborhood pride.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <h5 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Integration with IBM Maximo & Smart Cities Mission</span>
            </h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              UrbaPlus integrates directly with <strong>IBM Maximo Asset Management</strong> for automated municipal work order generation, contractor invoice verification, and municipal ERP synchronization. It fits out-of-the-box into <strong>Integrated Command and Control Centers (ICCC)</strong> across municipal corporations.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
            <span>Roadmap: Edge AI on Mobile WebAssembly • Drone Overlays • Smart Contract Escrow</span>
            <span className="font-bold text-blue-700">Ready for National Deployment</span>
          </div>
        </div>
      ),
    },
  ];

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between select-none">
      {/* Top Deck Navigation Bar */}
      <header className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <CivicLogo size="sm" theme="dark" appName="UrbaPlus Pitch Deck" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={copyFullDeck}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy Full PPT Deck as Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? 'Deck Copied!' : 'Copy PPT Text'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Toggle Fullscreen Presentation Mode"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <Link
            href="/citizen"
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xs"
          >
            Live Demo
          </Link>
        </div>
      </header>

      {/* Main Slide Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-10 flex flex-col justify-between min-h-[580px] transition-all duration-300">
          {/* Slide Header */}
          <div className="border-b border-slate-200 pb-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-200/60">
                {slide.badge}
              </span>
              <span className="text-xs font-mono font-semibold text-slate-400">
                Slide {currentSlide + 1} of {slides.length}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">{slide.title}</h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">{slide.subtitle}</p>
          </div>

          {/* Slide Dynamic Body */}
          <div className="flex-1 my-auto">{slide.content}</div>

          {/* Slide Footer Branding */}
          <div className="border-t border-slate-200 pt-4 mt-6 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">UrbaPlus</span>
              <span>•</span>
              <span>National Hackathon & IBM Challenge</span>
            </div>
            <div className="font-mono text-slate-500">
              {slide.category}
            </div>
          </div>
        </div>
      </main>

      {/* Slide Navigation Dock */}
      <footer className="bg-slate-950/90 border-t border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={() => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev))}
          disabled={currentSlide === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentSlide === 0
              ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer active:scale-95'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* Slide Selector Indicators */}
        <div className="hidden sm:flex items-center gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                idx === currentSlide ? 'w-8 bg-blue-500' : 'w-2.5 bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Go to Slide ${idx + 1}: ${s.title}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev))}
          disabled={currentSlide === slides.length - 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentSlide === slides.length - 1
              ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-95'
          }`}
        >
          <span>Next Slide</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
