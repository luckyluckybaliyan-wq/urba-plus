'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logSecurityEvent } from '@/lib/audit';
import { SAMPLE_ACCOUNTS, SampleAccount } from '@/lib/sampleAccounts';
import CivicLogo from '@/components/CivicLogo';
import {
  Building2,
  User,
  Loader2,
  LogOut,
  ArrowRight,
  Key,
  X,
  ChevronRight,
  Play,
} from 'lucide-react';

export default function UrbaPlusLandingPage() {
  const router = useRouter();

  // Auth & Session State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [existingRole, setExistingRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [signupRole, setSignupRole] = useState<'citizen' | 'authority'>('citizen');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [videoPlaying, setVideoPlaying] = useState(false);
  const isSigningInRef = useRef(false);

  const redirectByRole = useCallback(
    (userRole: string) => {
      const target = userRole === 'authority' ? '/authority' : userRole === 'admin' ? '/admin' : '/citizen';
      router.push(target);
    },
    [router]
  );

  // Check auth session on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isSigningInRef.current) return;

      let effUser: any = user;
      if (!effUser && typeof window !== 'undefined') {
        const storedEmail = localStorage.getItem('user_email');
        const storedUid = localStorage.getItem('user_uid');
        if (storedEmail && storedUid) {
          effUser = { uid: storedUid, email: storedEmail };
        }
      }

      if (effUser) {
        setCurrentUser(effUser);
        let role = 'citizen';
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('user_role');
          if (cached) role = cached;
        }

        try {
          const userDocPromise = getDoc(doc(db, 'users', effUser.uid));
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
          const snap: any = await Promise.race([userDocPromise, timeoutPromise]);
          if (snap && snap.exists && snap.exists()) {
            const data = snap.data();
            if (data?.role) {
              role = data.role;
              if (typeof window !== 'undefined') {
                localStorage.setItem('user_role', role);
              }
            }
          }
        } catch {
          // Graceful fallback
        }
        setExistingRole(role);
      } else {
        setCurrentUser(null);
        setExistingRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1-Click Quick Demo Login (for Hackathon Judges)
  const handleQuickDemoLogin = async (acc: SampleAccount) => {
    setEmail(acc.email);
    setPassword(acc.defaultPassword);
    setAuthError('');
    setAuthLoading(true);
    isSigningInRef.current = true;

    try {
      const cleanEmail = (acc.email || '').toLowerCase();
      const cleanPass = acc.defaultPassword;
      let user: any = null;

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        user = cred.user;
      } catch {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
          user = newCred.user;
        } catch {
          const fallbackUid = 'usr_' + cleanEmail.replace(/[^a-z0-9]/gi, '_');
          user = { uid: fallbackUid, email: cleanEmail };
        }
      }

      const activeUid = user?.uid || ('usr_' + cleanEmail.replace(/[^a-z0-9]/gi, '_'));
      const assignedRole = acc.role;

      try {
        await Promise.race([
          setDoc(
            doc(db, 'users', activeUid),
            {
              uid: activeUid,
              name: acc.name,
              email: cleanEmail,
              role: assignedRole,
              department: acc.department,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
      } catch {
        // proceed
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('user_role', assignedRole);
        localStorage.setItem('user_email', cleanEmail);
        localStorage.setItem('user_uid', activeUid);
      }

      try {
        await logSecurityEvent({
          userId: activeUid,
          email: cleanEmail,
          role: assignedRole,
          action: 'LOGIN_SUCCESS',
          portal: assignedRole as any,
          status: 'SUCCESS',
          details: `Quick login executed for role: ${assignedRole.toUpperCase()}.`,
        });
      } catch {
        // continue
      }

      redirectByRole(assignedRole);
    } catch (err: any) {
      console.error('Quick demo login error:', err);
      setAuthError(err?.message || 'Failed to sign in to demo account.');
      setAuthLoading(false);
      isSigningInRef.current = false;
    }
  };

  // Standard Form Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    isSigningInRef.current = true;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setAuthError('Please enter both email and password.');
      setAuthLoading(false);
      isSigningInRef.current = false;
      return;
    }

    let user: any = null;

    if (authMode === 'signin') {
      const sampleAcc = SAMPLE_ACCOUNTS.find((a) => a.email.toLowerCase() === cleanEmail);
      if (sampleAcc) {
        try {
          try {
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
            user = cred.user;
          } catch {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, sampleAcc.defaultPassword);
            user = newCred.user;
          }

          const activeUid = user?.uid || ('usr_' + cleanEmail.replace(/[^a-z0-9]/gi, '_'));
          const assignedRole = sampleAcc.role;

          if (typeof window !== 'undefined') {
            localStorage.setItem('user_role', assignedRole);
            localStorage.setItem('user_email', cleanEmail);
            localStorage.setItem('user_uid', activeUid);
          }

          redirectByRole(assignedRole);
          return;
        } catch {
          // continue to fallback
        }
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        user = cred.user;
      } catch {
        const fallbackUid = 'usr_' + cleanEmail.replace(/[^a-z0-9]/gi, '_');
        user = { uid: fallbackUid, email: cleanEmail };
      }

      const activeUid = user?.uid || ('usr_' + cleanEmail.replace(/[^a-z0-9]/gi, '_'));
      let assignedRole = 'citizen';

      try {
        const snap = await getDoc(doc(db, 'users', activeUid));
        if (snap.exists()) assignedRole = snap.data()?.role || 'citizen';
      } catch {
        // ignore
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('user_role', assignedRole);
        localStorage.setItem('user_email', cleanEmail);
        localStorage.setItem('user_uid', activeUid);
      }

      redirectByRole(assignedRole);
    } else {
      // Create Account
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        user = cred.user;
      } catch {
        const fallbackUid = 'usr_' + cleanEmail.replace(/[^a-z0-9]/gi, '_');
        user = { uid: fallbackUid, email: cleanEmail };
      }

      const activeUid = user?.uid || ('usr_' + cleanEmail.replace(/[^a-z0-9]/gi, '_'));
      const assignedRole = signupRole;

      try {
        await setDoc(
          doc(db, 'users', activeUid),
          {
            uid: activeUid,
            name: fullName.trim() || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: assignedRole,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {
        // ignore
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('user_role', assignedRole);
        localStorage.setItem('user_email', cleanEmail);
        localStorage.setItem('user_uid', activeUid);
      }

      redirectByRole(assignedRole);
    }
  };

  // Google OAuth
  const handleGoogleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);
    isSigningInRef.current = true;

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      if (!user || !user.email) {
        setAuthError('Google sign in failed.');
        setAuthLoading(false);
        isSigningInRef.current = false;
        return;
      }

      const googleEmail = (user.email || '').toLowerCase();
      let assignedRole = authMode === 'signup' ? signupRole : 'citizen';

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          assignedRole = snap.data()?.role || assignedRole;
        } else {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              uid: user.uid,
              name: user.displayName || fullName || 'Google User',
              email: googleEmail,
              role: assignedRole,
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch {
        // ignore
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('user_role', assignedRole);
        localStorage.setItem('user_email', googleEmail);
        localStorage.setItem('user_uid', user.uid);
      }

      redirectByRole(assignedRole);
    } catch (err: any) {
      setAuthError(err?.message || 'Google sign in failed.');
      isSigningInRef.current = false;
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f8f6] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f8f6] text-slate-900 font-sans flex flex-col">

      {/* ── HEADER ── */}
      <header className="w-full border-b border-slate-200 bg-[#f9f8f6]/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <CivicLogo size="md" appName="UrbaPlus" theme="light" />

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <>
                <button
                  type="button"
                  onClick={() => redirectByRole(existingRole || 'citizen')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  Go to dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut(auth);
                    setCurrentUser(null);
                    setExistingRole(null);
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('user_role');
                      localStorage.removeItem('user_email');
                      localStorage.removeItem('user_uid');
                    }
                  }}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthModalOpen(true); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthModalOpen(true); }}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <main className="flex-1 max-w-6xl mx-auto px-6 w-full">

        {/* Hero section */}
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Civic Infrastructure & Municipal Resolution Platform
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold tracking-wide uppercase">
                🚨 High-Alert Hazard SOS Active
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.1] text-slate-900 mb-5">
              Civic infrastructure,<br />
              <span className="text-slate-400">fixed intelligently.</span>
            </h1>

            <p className="text-base text-slate-500 leading-relaxed mb-8 max-w-xl">
              UrbaPlus lets citizens report civic defects and critical hazards (fire outbreaks, electrical wire breakages, gas leaks) with live GPS. Emergency hazards trigger high-alert SOS dispatches to municipal crews while routine defects undergo spatial deduplication and verified resolution.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthModalOpen(true); }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthModalOpen(true); }}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* Demo video */}
        <section className="py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">See it in action</p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Watch the app demo</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-xs text-right hidden sm:block">
              Full walkthrough — report, classify, dispatch, verify.
            </p>
          </div>

          {/* Video container */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm"
               style={{ aspectRatio: '16/9' }}>
            {!videoPlaying ? (
              /* Thumbnail + play button overlay */
              <>
                <img
                  src="https://img.youtube.com/vi/mTynBqld2T8/maxresdefault.jpg"
                  alt="UrbaPlus app demo thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://img.youtube.com/vi/mTynBqld2T8/hqdefault.jpg';
                  }}
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-slate-900/30" />
                {/* Play button */}
                <button
                  type="button"
                  onClick={() => setVideoPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center group cursor-pointer"
                  aria-label="Play demo video"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-200">
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900 fill-slate-900 ml-1" />
                  </div>
                </button>
                {/* Label */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <span className="text-white text-xs font-semibold bg-slate-900/60 px-2.5 py-1 rounded-md backdrop-blur-sm">
                    UrbaPlus · Full App Demo
                  </span>
                  <span className="text-white/70 text-[10px] bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm font-mono">
                    youtube.com
                  </span>
                </div>
              </>
            ) : (
              /* Embedded YouTube player — autoplay, no redirect */
              <iframe
                src="https://www.youtube.com/embed/mTynBqld2T8?autoplay=1&rel=0&modestbranding=1&playsinline=1"
                title="UrbaPlus App Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            )}
          </div>

          {/* Caption row */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {[
              'Emergency hazard dispatch (SOS)',
              'Automatic defect analysis',
              'GPS geotagging',
              'Duplicate detection',
              'Resolution verification',
              'Citizen notifications',
            ].map((tag) => (
              <span key={tag} className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* How it works */}
        <section className="py-14">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-8">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {[
              { n: '01', title: 'Capture & tag', desc: 'Citizen photos a defect. GPS coordinates are locked automatically.' },
              { n: '02', title: 'Smart classification', desc: 'Identifies issue type, severity, and responsible municipal department automatically.' },
              { n: '03', title: 'Deduplication', desc: 'Spatial radar merges overlapping ward tickets into one tracked case.' },
              { n: '04', title: 'Verify & close', desc: 'Repair video is inspected frame-by-frame. Ticket closes only when verified.' },
            ].map((item) => (
              <div key={item.n} className="bg-[#f9f8f6] p-6 sm:p-7">
                <span className="text-[11px] font-mono font-bold text-slate-300 block mb-3">{item.n}</span>
                <span className="text-sm font-semibold text-slate-800 block mb-1.5">{item.title}</span>
                <span className="text-xs text-slate-500 leading-relaxed">{item.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* Portal cards */}
        <section className="py-14">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-8">Portals</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                role: 'citizen',
                label: 'Citizen',
                desc: 'Report issues, track progress, and verify resolutions in your ward.',
                accent: 'bg-blue-50 border-blue-100 text-blue-700',
                dot: 'bg-blue-400',
              },
              {
                role: 'authority',
                label: 'Authority',
                desc: 'Manage incoming tickets, dispatch field crews, and submit resolution proofs.',
                accent: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                dot: 'bg-emerald-400',
              },
              {
                role: 'admin',
                label: 'Admin',
                desc: 'Full oversight — analytics, audit logs, and system configuration.',
                accent: 'bg-violet-50 border-violet-100 text-violet-700',
                dot: 'bg-violet-400',
              },
            ].map((p) => (
              <button
                key={p.role}
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthModalOpen(true); }}
                className="group text-left p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border mb-4 ${p.accent}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                  {p.label}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{p.desc}</p>
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Enter portal <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-[#f9f8f6]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>UrbaPlus · Citizen Infrastructure & Municipal Resolution Platform</span>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <span>Secure & Geotagged Civic Redressal</span>
            <span>•</span>
            <span>© {new Date().getFullYear()} UrbaPlus</span>
          </div>
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl relative my-8">

            {/* Close */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <CivicLogo size="sm" appName="UrbaPlus" theme="light" className="mb-3" />
              <h2 className="text-lg font-bold text-slate-900">
                {authMode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {authMode === 'signin' ? 'Sign in to your dashboard' : 'Join your ward community'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 mb-5">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(''); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  authMode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Create account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Aarav Mehta"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSignupRole('citizen')}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          signupRole === 'citizen'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" /> Citizen
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupRole('authority')}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          signupRole === 'authority'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" /> Authority
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 bg-white"
                />
              </div>

              {authError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mt-1"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign in' : `Create account`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center my-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-[10px] text-slate-400 uppercase tracking-wide">or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={authLoading}
              className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            {/* Quick demo logins */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2.5">
                <Key className="w-3 h-3" /> Demo logins
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    disabled={authLoading}
                    onClick={() => handleQuickDemoLogin(acc)}
                    className="p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-center transition-all cursor-pointer"
                  >
                    <span className="block text-xs font-semibold text-slate-800 capitalize">{acc.role}</span>
                    <span className="block text-[9px] text-slate-400 truncate mt-0.5">{acc.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
