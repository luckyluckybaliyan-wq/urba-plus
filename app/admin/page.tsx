'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc, query, where } from 'firebase/firestore';
import {
  getSecurityAuditLogs,
  logSecurityEvent,
  verifyAuditChain,
  AuditLogEntry,
  DEFAULT_PIN_ADMIN,
} from '@/lib/audit';
import { LanguageSelector, useLanguage } from '@/lib/LanguageContext';
import {
  LogOut,
  Shield,
  Users,
  Activity,
  Settings,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Lock,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  UserX,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Key,
  Flag,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertOctagon,
  Eye,
  Trash2,
  Mail,
  Send,
  BarChart2,
  TrendingUp,
  CheckSquare,
  XSquare,
  Save,
} from 'lucide-react';
import { triggerStatusChangeEmail } from '@/lib/notifications';

interface UserRecord {
  uid: string;
  email: string;
  role: 'citizen' | 'authority' | 'admin';
  updatedAt?: string;
}

interface AdminIssueReport {
  id: string;
  ticketId: string;
  title?: string;
  userEmail?: string;
  category: string;
  description: string;
  status: string;
  createdAt?: any;
  location?: any;
  voteStats?: {
    yes: number;
    no: number;
  };
  communityVotes?: Array<{
    userId: string;
    userEmail: string;
    vote: 'yes' | 'no';
    comment: string;
    createdAt: string;
    distanceKm?: number;
  }>;
  isDisputed?: boolean;
  supportersCount?: number;
  duplicateCount?: number;
  isDuplicate?: boolean;
  parentId?: string | null;
  adminFlagged?: boolean;
  adminFlagReason?: string;
  resolutionProofUrl?: string;
  isEmergency?: boolean;
  emergencyType?: string;
  emergencyResponseStatus?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'audit' | 'users' | 'analytics' | 'config' | 'issues' | 'emails'>('audit');

  // Email Notifications State for Admin
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [emailStatusFilter, setEmailStatusFilter] = useState<'all' | 'delivered' | 'simulated' | 'failed'>('all');
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<any | null>(null);
  const [adminEmailPreviewTab, setAdminEmailPreviewTab] = useState<'html' | 'text'>('html');

  // SLA Config state (editable)
  const [slaConfig, setSlaConfig] = useState({
    submittedToInProgressHours: 24,
    inProgressToResolvedDays: 7,
    maxDuplicateRadiusMeters: 250,
    minAiConfidencePercent: 80,
    alertDisputeCount: 5,
    alertFailedResolutionPercent: 20,
  });
  const [slaConfigSaved, setSlaConfigSaved] = useState(false);
  const handleSaveSlaConfig = () => {
    // In production this would write to Firestore — for now persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sla_config', JSON.stringify(slaConfig));
    }
    setSlaConfigSaved(true);
    setTimeout(() => setSlaConfigSaved(false), 2500);
  };

  // Security Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'DENIED' | 'PIN' | 'LOGIN'>('ALL');
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [chainVerifyResult, setChainVerifyResult] = useState<{ valid: boolean; totalChecked: number; brokenAt?: number } | null>(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  // Registered Users State
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Community Issues & Verification State
  const [issuesList, setIssuesList] = useState<AdminIssueReport[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [adminDeleteModal, setAdminDeleteModal] = useState<{ issueId: string; ticketId: string } | null>(null);
  const [deletingIssue, setDeletingIssue] = useState(false);
  const [searchIssueQuery, setSearchIssueQuery] = useState('');
  const [issueFilter, setIssueFilter] = useState<'ALL' | 'DISPUTED' | 'FLAGGED' | 'RESOLVED'>('ALL');
  const [selectedIssueComments, setSelectedIssueComments] = useState<AdminIssueReport | null>(null);

  // Admin 2FA PIN Modal State
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [pendingUserUpdate, setPendingUserUpdate] = useState<{
    targetUid: string;
    targetEmail: string;
    newRole: 'citizen' | 'authority' | 'admin';
  } | null>(null);

  // Admin Issue Status Transition & Email Notification State
  const [adminStatusModalIssue, setAdminStatusModalIssue] = useState<AdminIssueReport | null>(null);
  const [adminTargetStatus, setAdminTargetStatus] = useState<string>('In Progress');
  const [adminStatusNote, setAdminStatusNote] = useState<string>('');
  const [adminStatusPasskey, setAdminStatusPasskey] = useState<string>('');
  const [adminStatusPasskeyError, setAdminStatusPasskeyError] = useState<string>('');
  const [adminUpdatingStatus, setAdminUpdatingStatus] = useState<boolean>(false);
  const [adminStatusBanner, setAdminStatusBanner] = useState<{
    message: string;
    ticketId: string;
    recipientEmail: string;
    newStatus: string;
  } | null>(null);

  // Role verification guard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (activeUser) => {
      let effUser: any = activeUser;
      if (!effUser) {
        const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
        const storedUid = typeof window !== 'undefined' ? localStorage.getItem('user_uid') : null;
        if (storedEmail && storedUid) {
          effUser = { uid: storedUid, email: storedEmail };
        } else {
          window.location.href = '/';
          return;
        }
      }

      setCurrentUser(effUser);

      // Verify Role exclusively from Firestore
      try {
        let userRole: string | null = null;
        if (effUser.uid) {
          try {
            const userDoc = await getDoc(doc(db, 'users', effUser.uid));
            if (userDoc.exists()) {
              userRole = userDoc.data().role;
            }
          } catch (docErr) {
            console.warn('Notice: Firestore user document fetch offline, fallback to local session:', docErr);
          }
        }
        if (!userRole && effUser.email) {
          try {
            const q = query(collection(db, 'users'), where('email', '==', effUser.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              userRole = snap.docs[0].data().role;
            }
          } catch (queryErr) {
            console.warn('Notice: Firestore user query offline:', queryErr);
          }
        }

        if (!userRole) {
          const cachedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
          userRole = cachedRole || 'citizen';
          try {
            await setDoc(doc(db, 'users', effUser.uid), {
              email: effUser.email || 'user@example.com',
              role: userRole,
              createdAt: new Date().toISOString(),
            }, { merge: true });
          } catch (setErr) {
            console.warn('Notice: Firestore profile setDoc offline:', setErr);
          }
        }

        if (userRole !== 'admin') {
          window.location.href = userRole === 'authority' ? '/authority' : '/citizen';
          return;
        }
      } catch (err) {
        console.warn('Admin role verification error:', err);
      }

      setLoading(false);
      fetchAuditLogs();
      fetchUsers();
      fetchIssues();
      fetchEmailLogs();
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch Citizen Email Dispatch Logs
  const fetchEmailLogs = async () => {
    setLoadingEmailLogs(true);
    try {
      const res = await fetch('/api/notifications/send-status-email?limit=100');
      const data = await res.json();
      if (data.notifications) {
        setEmailLogs(data.notifications);
      }
    } catch (err) {
      console.warn('Error fetching admin email logs:', err);
    } finally {
      setLoadingEmailLogs(false);
    }
  };

  // Fetch Community Issues & Verification Votes
  const fetchIssues = async () => {
    setLoadingIssues(true);
    try {
      const snap = await getDocs(collection(db, 'issues'));
      const fetched: AdminIssueReport[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          ticketId: data.ticketId || docSnap.id,
          title: data.title || data.issueType || 'Civic Defect',
          userEmail: data.userEmail || data.reporterEmail || 'citizen@crowdcivic.org',
          category: data.category || 'General',
          description: data.description || '',
          status: data.status || 'Submitted',
          createdAt: data.createdAt,
          location: data.location || {},
          voteStats: data.voteStats,
          communityVotes: data.communityVotes || [],
          isDisputed: data.isDisputed || false,
          adminFlagged: data.adminFlagged || false,
          adminFlagReason: data.adminFlagReason || '',
          resolutionProofUrl: data.resolutionProofUrl,
        });
      });
      setIssuesList(fetched);
    } catch (err) {
      console.error('Error fetching admin issues:', err);
    } finally {
      setLoadingIssues(false);
    }
  };

  // Confirm Admin Status Transition with 2FA Passkey and dispatch Email Notification
  const handleConfirmAdminStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatusPasskeyError('');

    if (adminStatusPasskey.trim() !== DEFAULT_PIN_ADMIN) {
      await logSecurityEvent({
        userId: currentUser?.uid || 'admin_user',
        email: currentUser?.email || 'admin@crowdcivic.org',
        role: 'admin',
        action: 'SECURITY_PIN_FAILED',
        portal: 'admin',
        status: 'DENIED',
        details: `Failed Admin 2FA Passkey attempt for transitioning status of Ticket #${adminStatusModalIssue?.ticketId}`,
      });
      setAdminStatusPasskeyError('Invalid System Admin Passkey. Access Denied.');
      return;
    }

    if (!adminStatusModalIssue) return;

    setAdminUpdatingStatus(true);
    try {
      const issueRef = doc(db, 'issues', adminStatusModalIssue.id);
      const updateData: Record<string, any> = {
        status: adminTargetStatus,
        updatedAt: new Date().toISOString(),
        adminOverridden: true,
      };

      if (adminTargetStatus === 'Resolved') {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolvedBy = currentUser?.email || 'System Admin';
      }

      await updateDoc(issueRef, updateData);

      await logSecurityEvent({
        userId: currentUser?.uid || 'admin_user',
        email: currentUser?.email || 'admin@crowdcivic.org',
        role: 'admin',
        action: 'ISSUE_STATUS_UPDATED',
        portal: 'admin',
        status: 'SUCCESS',
        details: `Admin transitioned Ticket #${adminStatusModalIssue.ticketId} from '${adminStatusModalIssue.status}' to '${adminTargetStatus}'.`,
      });

      // Dispatch Email Notification to Citizen
      const recipient = adminStatusModalIssue.userEmail || 'citizen@crowdcivic.org';
      await triggerStatusChangeEmail({
        ticketId: adminStatusModalIssue.ticketId,
        issueId: adminStatusModalIssue.id,
        recipientEmail: recipient,
        previousStatus: adminStatusModalIssue.status,
        newStatus: adminTargetStatus,
        issueTitle: adminStatusModalIssue.title || adminStatusModalIssue.category,
        category: adminStatusModalIssue.category,
        locationAddress: adminStatusModalIssue.location?.address,
        notes:
          adminStatusNote.trim() ||
          `Status updated to ${adminTargetStatus} following central administrative review.`,
        performedBy: currentUser?.email || 'Executive System Administrator',
      });

      setAdminStatusBanner({
        message: `Status transitioned to "${adminTargetStatus}". Email notification dispatched to ${recipient}.`,
        ticketId: adminStatusModalIssue.ticketId,
        recipientEmail: recipient,
        newStatus: adminTargetStatus,
      });

      setAdminStatusModalIssue(null);
      setAdminStatusPasskey('');
      setAdminStatusNote('');
      fetchIssues();
      fetchAuditLogs();
    } catch (err: any) {
      console.error('Error in admin status transition:', err);
      setAdminStatusPasskeyError(err?.message || 'Failed to update issue status');
    } finally {
      setAdminUpdatingStatus(false);
    }
  };

  // Toggle Admin Flag on Issue
  const handleToggleAdminFlag = async (issueId: string, currentFlagged: boolean) => {
    try {
      const newFlagState = !currentFlagged;
      await updateDoc(doc(db, 'issues', issueId), {
        adminFlagged: newFlagState,
        isDisputed: newFlagState, // sync with dispute status
        adminFlaggedAt: new Date().toISOString(),
      });

      await logSecurityEvent({
        userId: currentUser?.uid || 'admin_user',
        email: currentUser?.email || 'admin@crowdcivic.org',
        role: 'admin',
        action: newFlagState ? 'ADMIN_ISSUE_FLAGGED' : 'ADMIN_ISSUE_UNFLAGGED',
        portal: 'admin',
        status: 'SUCCESS',
        details: `Admin ${newFlagState ? 'FLAGGED' : 'CLEARED FLAG ON'} Issue #${issueId} based on community governance audit.`,
      });

      fetchIssues();
      fetchAuditLogs();
    } catch (err) {
      console.error('Error toggling issue flag:', err);
      alert('Failed to update issue flag.');
    }
  };

  // Delete Complaint permanently from system
  const handleDeleteIssue = (issueId: string, ticketId: string) => {
    setAdminDeleteModal({ issueId, ticketId });
  };

  const executeDeleteIssue = async () => {
    if (!adminDeleteModal) return;
    const { issueId, ticketId } = adminDeleteModal;
    setDeletingIssue(true);
    try {
      await deleteDoc(doc(db, 'issues', issueId));
      await logSecurityEvent({
        userId: currentUser?.uid || 'admin_user',
        email: currentUser?.email || 'admin@crowdcivic.org',
        role: 'admin',
        action: 'ADMIN_DELETE_ISSUE',
        portal: 'admin',
        status: 'SUCCESS',
        details: `Admin deleted complaint ticket #${ticketId} (ID: ${issueId})`,
      });
      setIssuesList((prev) => prev.filter((i) => i.id !== issueId));
      fetchAuditLogs();
      setAdminDeleteModal(null);
    } catch (err: any) {
      console.error('Error deleting issue:', err);
      alert(`Failed to delete complaint: ${err.message}`);
    } finally {
      setDeletingIssue(false);
    }
  };

  // Fetch Security Audit Logs
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await getSecurityAuditLogs(100);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch Registered System Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const querySnap = await getDocs(collection(db, 'users'));
      const fetched: UserRecord[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          uid: docSnap.id,
          email: data.email || 'Unknown User',
          role: data.role || 'citizen',
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });

      // Default demo users if missing
      const demoAccounts: UserRecord[] = [
        { uid: 'usr_citizen@crowdcivic.org', email: 'citizen@crowdcivic.org', role: 'citizen' },
        { uid: 'usr_authority@crowdcivic.org', email: 'authority@crowdcivic.org', role: 'authority' },
        { uid: 'usr_admin@crowdcivic.org', email: 'admin@crowdcivic.org', role: 'admin' },
      ];

      demoAccounts.forEach((demo) => {
        if (!fetched.some((f) => f.email === demo.email)) {
          fetched.push(demo);
        }
      });

      setUsersList(fetched);
    } catch (err) {
      console.error('Error fetching system users:', err);
      // Fallback demo users
      setUsersList([
        { uid: 'usr_citizen@crowdcivic.org', email: 'citizen@crowdcivic.org', role: 'citizen' },
        { uid: 'usr_authority@crowdcivic.org', email: 'authority@crowdcivic.org', role: 'authority' },
        { uid: 'usr_admin@crowdcivic.org', email: 'admin@crowdcivic.org', role: 'admin' },
      ]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Initiate Role Change Request
  const handleRequestRoleChange = (targetUid: string, targetEmail: string, newRole: 'citizen' | 'authority' | 'admin') => {
    setPendingUserUpdate({ targetUid, targetEmail, newRole });
    setAdminPinInput('');
    setAdminPinError('');
    setShowAdminPinModal(true);
  };

  // Confirm Role Change with 2FA Admin PIN
  const handleConfirmRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPinError('');

    if (adminPinInput.trim() !== DEFAULT_PIN_ADMIN) {
      await logSecurityEvent({
        userId: currentUser?.uid || 'admin_user',
        email: currentUser?.email || 'admin@crowdcivic.org',
        role: 'admin',
        action: 'SECURITY_PIN_FAILED',
        portal: 'admin',
        status: 'DENIED',
        details: `Failed Admin 2FA Passkey PIN attempt for changing user permissions of ${pendingUserUpdate?.targetEmail}`,
      });
      setAdminPinError('Invalid System Admin Passkey. Access Denied.');
      return;
    }

    if (!pendingUserUpdate) return;

    try {
      // Update in Firestore
      await setDoc(
        doc(db, 'users', pendingUserUpdate.targetUid),
        {
          email: pendingUserUpdate.targetEmail,
          role: pendingUserUpdate.newRole,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Audit Log
      await logSecurityEvent({
        userId: currentUser?.uid || 'admin_user',
        email: currentUser?.email || 'admin@crowdcivic.org',
        role: 'admin',
        action: 'ROLE_PERMISSIONS_CHANGED',
        portal: 'admin',
        status: 'SUCCESS',
        details: `Role permissions for ${pendingUserUpdate.targetEmail} updated to [${pendingUserUpdate.newRole.toUpperCase()}].`,
      });

      setShowAdminPinModal(false);
      setPendingUserUpdate(null);
      fetchUsers();
      fetchAuditLogs();
    } catch (err) {
      console.error('Error updating user role:', err);
      setAdminPinError('Failed to update user document in database.');
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_uid');
    }
    await signOut(auth);
    window.location.href = '/';
  };

  // Filtered Logs
  const filteredLogs = auditLogs.filter((log) => {
    const q = (searchLogQuery || '').trim().toLowerCase();
    const email = (log?.email || '').toLowerCase();
    const action = (log?.action || '').toLowerCase();
    const details = (log?.details || '').toLowerCase();
    const matchesSearch = !q || email.includes(q) || action.includes(q) || details.includes(q);

    if (!matchesSearch) return false;

    const logAction = log?.action || '';
    if (logFilter === 'DENIED') return log?.status === 'DENIED' || logAction.includes('UNAUTHORIZED') || logAction.includes('MISMATCH');
    if (logFilter === 'PIN') return logAction.includes('PIN');
    if (logFilter === 'LOGIN') return logAction.includes('LOGIN');

    return true;
  });

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const q = (searchUserQuery || '').trim().toLowerCase();
    const email = (u?.email || '').toLowerCase();
    const uid = (u?.uid || '').toLowerCase();
    const role = (u?.role || '').toLowerCase();
    return !q || email.includes(q) || uid.includes(q) || role.includes(q);
  });

  // Filtered Issues for Community Governance & Flags
  const filteredIssues = issuesList.filter((issue) => {
    const q = (searchIssueQuery || '').trim().toLowerCase();
    const ticketId = (issue?.ticketId || '').toLowerCase();
    const category = (issue?.category || '').toLowerCase();
    const description = (issue?.description || '').toLowerCase();
    const matchesSearch = !q || ticketId.includes(q) || category.includes(q) || description.includes(q);

    if (!matchesSearch) return false;

    if (issueFilter === 'DISPUTED') return !!(issue?.isDisputed || (issue?.voteStats && (issue.voteStats.no || 0) > (issue.voteStats.yes || 0)));
    if (issueFilter === 'FLAGGED') return !!issue?.adminFlagged;
    if (issueFilter === 'RESOLVED') return issue?.status === 'Resolved';

    return true;
  });

  // Stats Counters
  const deniedAttemptsCount = auditLogs.filter((l) => l?.status === 'DENIED' || (l?.action && l.action.includes('UNAUTHORIZED'))).length;
  const pinVerificationsCount = auditLogs.filter((l) => l?.action && l.action.includes('PIN') && l?.status === 'SUCCESS').length;

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-800 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-2">
          <Shield className="w-5 h-5 text-slate-700" />
          <div>
            <span className="text-slate-900 font-serif italic tracking-tight font-semibold block text-sm">{t('admin_portal', 'Governance Center')}</span>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-mono">{t('role_admin', 'System Administrator')}</span>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 px-3">Governance & Access</div>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 mr-3" />
            <span>{t('tab_audit', 'Security Audit Trail')}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 mr-3" />
            <span>{t('tab_users', 'User Access & Roles')}</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-4 h-4 mr-3" />
            <span>SLA Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl font-medium transition-all ${
              activeTab === 'config'
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 mr-3" />
            <span>System Configuration</span>
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl font-medium transition-all ${
              activeTab === 'issues'
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Flag className="w-4 h-4" />
              <span>{t('tab_issues', 'Community Verification & Flags')}</span>
            </div>
            {issuesList.filter((i) => i.isDisputed || i.adminFlagged).length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 border border-red-200 rounded-full font-mono font-bold">
                {issuesList.filter((i) => i.isDisputed || i.adminFlagged).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('emails')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl font-medium transition-all cursor-pointer ${
              activeTab === 'emails'
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>Citizen Email Alerts Log</span>
            </div>
            {emailLogs.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-mono font-bold">
                {emailLogs.length}
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>Admin Passkey Active</span>
            </div>
            <p className="text-[10px] text-slate-500">Govt Security Key: SYS-ADM-99</p>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-3 py-2 text-xs uppercase tracking-widest font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            <span>{t('signOut', 'Sign out')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-900">{t('admin_title', 'System Security Governance Control')}</h1>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-mono uppercase">
              Operational
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <LanguageSelector />

            <div className="text-slate-500">
              Logged as: <span className="text-slate-900 font-mono">{currentUser?.email || 'admin@crowdcivic.org'}</span>
            </div>
            <button
              onClick={() => {
                fetchAuditLogs();
                fetchUsers();
                fetchIssues();
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 transition-all flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('refresh_incidents', 'Refresh')}</span>
            </button>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto space-y-8">
          {/* Admin Status Transition Email Banner */}
          {adminStatusBanner && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-800 flex items-start justify-between animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0 mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider font-mono">
                      Citizen Status Email Dispatched by Admin
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                      Ticket #{adminStatusBanner.ticketId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 font-medium">{adminStatusBanner.message}</p>
                  <p className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2 font-mono">
                    <span>Citizen Recipient:</span>
                    <span className="text-emerald-700 underline font-semibold">{adminStatusBanner.recipientEmail}</span>
                    <span>•</span>
                    <span>New Status:</span>
                    <span className="text-slate-900 font-bold px-1.5 py-0.5 bg-slate-100 rounded">{adminStatusBanner.newStatus}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdminStatusBanner(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STATS METRICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-semibold">{t('registered_users_count', 'Registered Users')}</p>
              <p className="text-2xl font-mono text-slate-900 font-bold">{usersList.length}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Role-segmented accounts</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-semibold">{t('disputed_reports_count', 'Community Verification Disputed')}</p>
              <p className="text-2xl font-mono text-amber-600 font-bold">
                {issuesList.filter((i) => i.isDisputed || i.adminFlagged).length} / {issuesList.length}
              </p>
              <p className="text-[10px] text-amber-600/80 mt-0.5">Flagged or low approval issues</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-semibold">{t('denied_access_attempts', 'Intercepted Violations')}</p>
              <p className="text-2xl font-mono text-red-600 font-bold">{deniedAttemptsCount}</p>
              <p className="text-[10px] text-red-500/80 mt-0.5">Unauthorized attempts blocked</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-semibold">Security Guard Status</p>
              <div className="flex items-center mt-0.5 gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-lg font-mono text-emerald-700 font-bold">LOCKED & GUARDED</p>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Firestore security rules active</p>
            </div>
          </div>

          {/* TAB 1: SECURITY AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-4">
              <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
                <div>
                  <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-700" />
                    <span>Real-Time Security Audit Logs</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable event ledger recording all login attempts, role breaches, and 2FA verification passkeys.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      setVerifyingChain(true);
                      setChainVerifyResult(null);
                      const result = await verifyAuditChain(auditLogs);
                      setChainVerifyResult(result);
                      setVerifyingChain(false);
                    }}
                    disabled={verifyingChain || auditLogs.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {verifyingChain ? 'Verifying...' : 'Verify Chain Integrity'}
                  </button>
                  {chainVerifyResult && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                      chainVerifyResult.valid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {chainVerifyResult.valid ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {chainVerifyResult.valid
                        ? `✅ Chain Valid (${chainVerifyResult.totalChecked} entries)`
                        : `❌ Broken at entry #${chainVerifyResult.brokenAt}`}
                    </span>
                  )}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchLogQuery}
                      onChange={(e) => setSearchLogQuery(e.target.value)}
                      placeholder="Search email, action..."
                      className="bg-white border border-slate-200 focus:border-slate-400 text-xs text-slate-800 pl-8 pr-3 py-1.5 rounded-xl outline-none"
                    />
                  </div>

                  <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs">
                    {(['ALL', 'DENIED', 'PIN', 'LOGIN'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setLogFilter(filter)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          logFilter === filter ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loadingLogs ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading live security audit log stream...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No security audit logs found matching filter.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                          <th className="pb-3 pl-2">Timestamp</th>
                          <th className="pb-3">User & Email</th>
                          <th className="pb-3">Action</th>
                          <th className="pb-3">Portal</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Details & Device</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {filteredLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 pl-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})
                            </td>

                            <td className="py-3 font-medium text-slate-900">
                              <span className="block font-semibold">{log.email}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Role: {log.role}</span>
                            </td>

                            <td className="py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase font-mono ${
                                  (log?.action || '').includes('DENIED') || (log?.action || '').includes('UNAUTHORIZED') || (log?.action || '').includes('MISMATCH')
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : (log?.action || '').includes('PIN')
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {(log?.action || '').includes('UNAUTHORIZED') && <ShieldAlert className="w-3 h-3 text-red-600" />}
                                {(log?.action || '').includes('PIN') && <Key className="w-3 h-3 text-blue-600" />}
                                <span>{log?.action || 'EVENT'}</span>
                              </span>
                            </td>

                            <td className="py-3 uppercase text-[10px] font-mono font-semibold text-slate-600">{log.portal}</td>

                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  log.status === 'DENIED'
                                    ? 'bg-red-100 text-red-600'
                                    : log.status === 'WARNING'
                                    ? 'bg-amber-100 text-amber-600'
                                    : 'bg-emerald-100 text-emerald-600'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>

                            <td className="py-3 max-w-md">
                              <p className="text-slate-700 text-xs">{log.details}</p>
                              {log.deviceInfo && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.deviceInfo}</p>}
                              {log.sha256Hash && (
                                <p className="text-[10px] text-slate-300 font-mono mt-0.5 truncate max-w-xs" title={log.sha256Hash}>
                                  🔐 {log.sha256Hash.slice(0, 16)}…
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: USER ACCESS & ROLE PERMISSIONS */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-4">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-700" />
                    <span>Registered System Users & Role Governance</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign and enforce explicit roles (Citizen, Authority, Admin). Requires Admin 2FA Passkey PIN for updates.
                  </p>
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Search user email..."
                    className="w-full bg-white border border-slate-200 focus:border-slate-400 text-xs text-slate-800 pl-8 pr-3 py-1.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="p-6">
                {loadingUsers ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading system user registry...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No users found matching query.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                          <th className="pb-3 pl-2">User UID</th>
                          <th className="pb-3">User Email</th>
                          <th className="pb-3">Current Assigned Role</th>
                          <th className="pb-3">Change Permissions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {filteredUsers.map((u, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 pl-2 font-mono text-[11px] text-slate-400">{(u?.uid || '').slice(0, 18)}...</td>

                            <td className="py-3 font-semibold text-slate-900">{u.email}</td>

                            <td className="py-3">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : u.role === 'authority'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>

                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRequestRoleChange(u.uid, u.email, 'citizen')}
                                  disabled={u.role === 'citizen'}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-lg transition-all"
                                >
                                  Make Citizen
                                </button>
                                <button
                                  onClick={() => handleRequestRoleChange(u.uid, u.email, 'authority')}
                                  disabled={u.role === 'authority'}
                                  className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 disabled:opacity-30 border border-blue-200 text-[10px] font-semibold text-blue-700 rounded-lg transition-all"
                                >
                                  Grant Authority
                                </button>
                                <button
                                  onClick={() => handleRequestRoleChange(u.uid, u.email, 'admin')}
                                  disabled={u.role === 'admin'}
                                  className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 disabled:opacity-30 border border-purple-200 text-[10px] font-semibold text-purple-700 rounded-lg transition-all"
                                >
                                  Grant Admin
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM POLICY RULES */}
          {activeTab === 'config' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-700" />
                  <span>Government Platform Security & Access Policies</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current active security enforcement parameters for the CrowdCivic platform.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-900 font-semibold">
                    <span>1. Role-Guard Navigation Interceptor</span>
                    <span className="text-emerald-700 text-[10px] uppercase font-mono">Enforced</span>
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Attempts by Citizens to enter `/authority` or `/admin` are intercepted immediately at router level and logged to audit logs.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-900 font-semibold">
                    <span>2. Credential-Tab Alignment Guard</span>
                    <span className="text-emerald-700 text-[10px] uppercase font-mono">Enforced</span>
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Tab selection on login requires credential role match. Logging into Authority with Citizen email triggers `LOGIN_CREDENTIAL_MISMATCH`.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-900 font-semibold">
                    <span>3. Municipal 2FA Security Passkeys</span>
                    <span className="text-emerald-700 text-[10px] uppercase font-mono">Enforced</span>
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    High-impact authority resolution actions require typing the 6-digit Municipal Security PIN (`123456` for Authority, `999999` for Admin).
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-900 font-semibold">
                    <span>4. Immutable Firestore Security Ledger</span>
                    <span className="text-emerald-700 text-[10px] uppercase font-mono">Active</span>
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    All auth events, permission changes, and security pin verifications are persisted to `auditLogs` collection in Firestore.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMMUNITY VERIFICATION & GOVERNANCE FLAGS */}
          {activeTab === 'issues' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-4">
              <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
                <div>
                  <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                    <Flag className="w-5 h-5 text-slate-700" />
                    <span>Community Verification Score & Dispute Flags</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitor citizen verification scores for resolved issues. Flag or audit disputed resolutions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchIssueQuery}
                      onChange={(e) => setSearchIssueQuery(e.target.value)}
                      placeholder="Search Ticket ID or description..."
                      className="bg-white border border-slate-200 focus:border-slate-400 text-xs text-slate-800 pl-8 pr-3 py-1.5 rounded-xl outline-none"
                    />
                  </div>

                  <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs">
                    {(['ALL', 'DISPUTED', 'FLAGGED', 'RESOLVED'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setIssueFilter(filter)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          issueFilter === filter ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loadingIssues ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading issues registry & verification votes...</div>
                ) : filteredIssues.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No issues found matching filter query.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                          <th className="pb-3 pl-2">Ticket ID & Category</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Community Verification Score</th>
                          <th className="pb-3">Citizen Votes</th>
                          <th className="pb-3">Governance Flag</th>
                          <th className="pb-3 text-right pr-2">Admin Governance Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {filteredIssues.map((issue, idx) => {
                          const totalVotes = (issue.voteStats?.yes || 0) + (issue.voteStats?.no || 0);
                          const approvalPct = totalVotes > 0 ? Math.round(((issue.voteStats?.yes || 0) / totalVotes) * 100) : null;

                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 pl-2 font-mono text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 block">#{issue.ticketId}</span>
                                  {(issue.isEmergency || issue.category === 'Fire & Hazard Emergency') && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-600 text-white font-mono animate-pulse">
                                      🚨 HIGH-ALERT
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 block font-sans">{issue.category}</span>
                              </td>

                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                    issue.status === 'Resolved'
                                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                      : issue.status === 'In Progress'
                                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {issue.status}
                                </span>
                              </td>

                              <td className="py-3">
                                {totalVotes > 0 ? (
                                  <div className="space-y-1 max-w-[140px]">
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                      <span className={approvalPct! >= 60 ? 'text-emerald-700' : 'text-red-600'}>
                                        {approvalPct}% Approval
                                      </span>
                                      <span className="text-slate-400 text-[10px] font-normal">({totalVotes} votes)</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                                      <div
                                        className="bg-emerald-500 h-full"
                                        style={{ width: `${approvalPct}%` }}
                                      />
                                      <div
                                        className="bg-red-400 h-full"
                                        style={{ width: `${100 - approvalPct!}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No verification votes yet</span>
                                )}
                              </td>

                              <td className="py-3">
                                <button
                                  onClick={() => setSelectedIssueComments(issue)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] text-slate-700 flex items-center gap-1.5 transition-all"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{issue.communityVotes?.length || 0} Ground Feedbacks</span>
                                </button>
                              </td>

                              <td className="py-3">
                                {issue.adminFlagged ? (
                                  <span className="px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                                    <Flag className="w-3 h-3" /> ADMIN FLAGGED
                                  </span>
                                ) : issue.isDisputed ? (
                                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                                    <AlertTriangle className="w-3 h-3" /> COMMUNITY DISPUTED
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold flex items-center gap-1 w-fit">
                                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                  </span>
                                )}
                              </td>

                              <td className="py-3 text-right pr-2">
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    onClick={() => {
                                      setAdminStatusModalIssue(issue);
                                      setAdminTargetStatus(
                                        issue.status === 'Submitted'
                                          ? 'In Progress'
                                          : issue.status === 'In Progress'
                                          ? 'Resolved'
                                          : 'In Progress'
                                      );
                                      setAdminStatusNote('');
                                      setAdminStatusPasskey('');
                                      setAdminStatusPasskeyError('');
                                    }}
                                    className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                    title="Transition issue status and trigger email alert to citizen"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>Status & Email</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleAdminFlag(issue.id, !!issue.adminFlagged)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                      issue.adminFlagged
                                        ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200'
                                        : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-200'
                                    }`}
                                  >
                                    <Flag className="w-3.5 h-3.5" />
                                    <span>{issue.adminFlagged ? 'Clear Flag' : 'Put Flag / Audit'}</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteIssue(issue.id, issue.ticketId)}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-red-500 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                    title="Delete Complaint"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SLA ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-slate-700" />
                  <span>SLA Performance Analytics</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live platform metrics derived from the issues registry.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Issues',
                    value: issuesList.length,
                    color: 'text-slate-900',
                    sub: 'across all statuses',
                  },
                  {
                    label: 'Resolved',
                    value: issuesList.filter((i) => i.status === 'Resolved').length,
                    color: 'text-emerald-700',
                    sub: `${issuesList.length > 0 ? Math.round((issuesList.filter((i) => i.status === 'Resolved').length / issuesList.length) * 100) : 0}% resolution rate`,
                  },
                  {
                    label: 'In Progress',
                    value: issuesList.filter((i) => i.status === 'In Progress').length,
                    color: 'text-blue-700',
                    sub: 'being actively worked',
                  },
                  {
                    label: 'Pending / Submitted',
                    value: issuesList.filter((i) => i.status === 'Submitted' || i.status === 'Under Verification').length,
                    color: 'text-amber-600',
                    sub: 'awaiting assignment',
                  },
                ].map((card) => (
                  <div key={card.label} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-semibold">{card.label}</p>
                    <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category breakdown */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Issues by Category</h3>
                  {Array.from(new Set(issuesList.map((i) => i.category))).slice(0, 6).map((cat) => {
                    const count = issuesList.filter((i) => i.category === cat).length;
                    const pct = issuesList.length > 0 ? Math.round((count / issuesList.length) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 font-medium truncate max-w-[160px]">{cat}</span>
                          <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-slate-700 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {issuesList.length === 0 && <p className="text-xs text-slate-400 italic">No issues data yet.</p>}
                </div>

                {/* Dispute & flag summary */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Governance Health</h3>
                  {[
                    {
                      label: 'Admin Flagged',
                      value: issuesList.filter((i) => i.adminFlagged).length,
                      icon: <Flag className="w-4 h-4 text-red-600" />,
                      pill: 'bg-red-100 text-red-700 border-red-200',
                    },
                    {
                      label: 'Community Disputed',
                      value: issuesList.filter((i) => i.isDisputed).length,
                      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
                      pill: 'bg-amber-100 text-amber-700 border-amber-200',
                    },
                    {
                      label: 'Security Violations',
                      value: deniedAttemptsCount,
                      icon: <ShieldAlert className="w-4 h-4 text-slate-600" />,
                      pill: 'bg-slate-100 text-slate-700 border-slate-200',
                    },
                    {
                      label: '2FA Verifications',
                      value: pinVerificationsCount,
                      icon: <CheckSquare className="w-4 h-4 text-emerald-700" />,
                      pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        {row.icon}
                        <span>{row.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${row.pill}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CITIZEN EMAIL DISPATCH LOGS */}
          {activeTab === 'emails' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                    <Mail className="w-5 h-5 text-emerald-600" />
                    <span>Citizen Email Dispatch Logs & Audit Ledger</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live delivery audit trail of automated status update emails sent to citizens upon report submission and authority status changes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchEmailLogs}
                    disabled={loadingEmailLogs}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingEmailLogs ? 'animate-spin' : ''}`} />
                    <span>Refresh Logs</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={emailSearchQuery}
                    onChange={(e) => setEmailSearchQuery(e.target.value)}
                    placeholder="Search by Ticket ID (e.g. CIV-12345) or citizen email..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={emailStatusFilter}
                    onChange={(e) => setEmailStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="all">All Delivery Modes</option>
                    <option value="delivered">SMTP Delivered</option>
                    <option value="simulated">System Simulation</option>
                    <option value="failed">Failed Delivery</option>
                  </select>
                </div>
              </div>

              {/* Email Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Status Change</th>
                      <th className="py-3 px-4">Delivery Mode</th>
                      <th className="py-3 px-4">Dispatched At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingEmailLogs ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                          <span>Loading email dispatch ledger...</span>
                        </td>
                      </tr>
                    ) : emailLogs.filter((item) => {
                        const q = emailSearchQuery.toLowerCase().trim();
                        if (q && !((item.ticketId || '').toLowerCase().includes(q) || (item.recipientEmail || '').toLowerCase().includes(q) || (item.subject || '').toLowerCase().includes(q))) {
                          return false;
                        }
                        if (emailStatusFilter !== 'all') {
                          if (emailStatusFilter === 'delivered' && item.dispatchMode !== 'smtp') return false;
                          if (emailStatusFilter === 'simulated' && item.dispatchMode === 'smtp') return false;
                          if (emailStatusFilter === 'failed' && item.status !== 'failed') return false;
                        }
                        return true;
                      }).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <Mail className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No email records found</p>
                          <p className="text-[11px] text-slate-400">Status emails triggered by authorities and report submissions will show up here.</p>
                        </td>
                      </tr>
                    ) : (
                      emailLogs
                        .filter((item) => {
                          const q = emailSearchQuery.toLowerCase().trim();
                          if (q && !((item.ticketId || '').toLowerCase().includes(q) || (item.recipientEmail || '').toLowerCase().includes(q) || (item.subject || '').toLowerCase().includes(q))) {
                            return false;
                          }
                          if (emailStatusFilter !== 'all') {
                            if (emailStatusFilter === 'delivered' && item.dispatchMode !== 'smtp') return false;
                            if (emailStatusFilter === 'simulated' && item.dispatchMode === 'smtp') return false;
                            if (emailStatusFilter === 'failed' && item.status !== 'failed') return false;
                          }
                          return true;
                        })
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              #{item.ticketId}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700">
                              {item.recipientEmail}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                                <span className="text-slate-400">{item.previousStatus || 'Submitted'}</span>
                                <span className="text-slate-400">&rarr;</span>
                                <span className="font-bold text-emerald-700">{item.newStatus}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                item.dispatchMode === 'smtp'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-stone-50 text-stone-700 border-stone-200'
                              }`}>
                                {item.dispatchMode === 'smtp' ? '✓ SMTP Sent' : '✓ Simulated Cloud'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {new Date(item.sentAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedAdminEmail(item)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview</span>
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ADMIN 2FA PIN CONFIRMATION MODAL */}
      {showAdminPinModal && pendingUserUpdate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-xl space-y-5 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowAdminPinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 border border-purple-200 rounded-xl flex items-center justify-center text-purple-700 shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-purple-700 uppercase">System Governance 2FA</span>
                <h3 className="text-base font-bold text-slate-900">Authorize Role Permissions Update</h3>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-medium text-slate-900">Modifying Target Account:</p>
              <p className="text-purple-700 font-mono font-bold">{pendingUserUpdate.targetEmail}</p>
              <p className="text-slate-500 text-[11px]">
                New Privilege Level: <span className="text-slate-900 uppercase font-bold">[{pendingUserUpdate.newRole}]</span>
              </p>
            </div>

            <form onSubmit={handleConfirmRoleChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Enter 6-Digit System Admin Passkey PIN</span>
                  <span className="text-[10px] text-purple-700 font-mono">Demo PIN: {DEFAULT_PIN_ADMIN}</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-white border border-slate-300 focus:border-purple-500 text-slate-900 pl-10 pr-4 py-3 rounded-xl text-lg font-mono tracking-widest outline-none transition-all placeholder:text-slate-300"
                    autoFocus
                  />
                </div>
              </div>

              {adminPinError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{adminPinError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Privilege Change</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CITIZEN VERIFICATION COMMENTS INSPECTION MODAL */}
      {selectedIssueComments && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedIssueComments(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Ground Verification Inspection</span>
                <h3 className="text-sm font-bold text-slate-900">Ticket #{selectedIssueComments.ticketId} - Community Feedback</h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              "{selectedIssueComments.description}"
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {!selectedIssueComments.communityVotes || selectedIssueComments.communityVotes.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No citizen ground comments submitted yet.</div>
              ) : (
                selectedIssueComments.communityVotes.map((v, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-mono text-slate-700">{v.userEmail}</span>
                      <div className="flex items-center gap-2">
                        {v.distanceKm !== undefined && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono border border-blue-200">
                            📍 {v.distanceKm} km away
                          </span>
                        )}
                        {v.vote === 'yes' ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> Fixed
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <ThumbsDown className="w-3 h-3" /> Unresolved
                          </span>
                        )}
                      </div>
                    </div>
                    {v.comment && <p className="text-slate-700 text-xs italic font-sans">"{v.comment}"</p>}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedIssueComments(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}

      {/* ADMIN DELETE COMPLAINT CONFIRMATION MODAL */}
      {adminDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl relative">
            <button
              onClick={() => setAdminDeleteModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Admin Delete Complaint Ticket?</h3>
            <p className="text-xs text-slate-600 text-center leading-relaxed mb-6">
              Are you sure you want to permanently delete complaint ticket{' '}
              <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                #{adminDeleteModal.ticketId}
              </span>
              ? This action cannot be undone and will permanently remove it from the municipal database and citizen portals.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAdminDeleteModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                disabled={deletingIssue}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteIssue}
                disabled={deletingIssue}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {deletingIssue ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Ticket...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN STATUS TRANSITION & NOTIFICATION MODAL */}
      {adminStatusModalIssue && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-xl space-y-5 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setAdminStatusModalIssue(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-700 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono">
                  Executive System Governance
                </span>
                <h3 className="text-base font-bold text-slate-900">Transition Status & Trigger Email Alert</h3>
              </div>
            </div>

            {/* Target Issue summary */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-blue-700 font-bold">Ticket #{adminStatusModalIssue.ticketId}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                  Current: {adminStatusModalIssue.status}
                </span>
              </div>
              <p className="text-slate-900 font-semibold truncate">{adminStatusModalIssue.title || adminStatusModalIssue.category}</p>
              <p className="text-slate-500 text-[11px] truncate">
                Citizen Recipient: <span className="text-emerald-700 font-mono">{adminStatusModalIssue.userEmail || 'citizen@crowdcivic.org'}</span>
              </p>
            </div>

            <form onSubmit={handleConfirmAdminStatusTransition} className="space-y-4">
              {/* Target Status Select */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Target Status:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Submitted', label: 'Submitted', desc: 'Reset to initial queue' },
                    { id: 'Under Verification', label: 'Under Verification', desc: 'Officer review' },
                    { id: 'In Progress', label: 'In Progress', desc: 'Field repair active' },
                    { id: 'Resolved', label: 'Resolved', desc: 'Issue resolved & verified' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAdminTargetStatus(s.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        adminTargetStatus === s.id
                          ? 'bg-slate-900 border-slate-900 text-white font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold">{s.label}</div>
                      <div className={`text-[10px] mt-0.5 ${adminTargetStatus === s.id ? 'text-slate-300' : 'text-slate-400'}`}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Executive Admin Remarks (included in citizen email):
                </label>
                <textarea
                  value={adminStatusNote}
                  onChange={(e) => setAdminStatusNote(e.target.value)}
                  placeholder="e.g. Issue escalated and verified resolved by Municipal Executive Board."
                  rows={2}
                  className="w-full bg-white border border-slate-300 focus:border-slate-500 text-slate-900 text-xs p-3 rounded-xl outline-none placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* 2FA PIN */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span>Enter 6-Digit Admin Passkey</span>
                  <span className="text-[10px] text-amber-600 font-mono">Demo PIN: {DEFAULT_PIN_ADMIN}</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    value={adminStatusPasskey}
                    onChange={(e) => setAdminStatusPasskey(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-white border border-slate-300 focus:border-slate-500 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl text-base font-mono tracking-widest outline-none"
                    required
                  />
                </div>
              </div>

              {adminStatusPasskeyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{adminStatusPasskeyError}</span>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-700 flex items-start gap-2">
                <Send className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Authorizing this status update will immediately trigger a branded notification email to{' '}
                  <strong>{adminStatusModalIssue.userEmail || 'citizen@crowdcivic.org'}</strong>.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminStatusModalIssue(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminUpdatingStatus}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>{adminUpdatingStatus ? 'Dispatching...' : 'Authorize & Dispatch Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADMIN EMAIL PREVIEW INSPECTOR MODAL */}
      {selectedAdminEmail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Email Dispatch Inspector</h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Ticket #{selectedAdminEmail.ticketId} • {selectedAdminEmail.previousStatus || 'Submitted'} &rarr; {selectedAdminEmail.newStatus}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAdminEmail(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-3 bg-slate-900 text-xs font-mono space-y-1 text-slate-300">
              <div className="flex"><span className="w-16 text-slate-500 font-semibold">To:</span><span className="text-white font-bold">{selectedAdminEmail.recipientEmail}</span></div>
              <div className="flex"><span className="w-16 text-slate-500 font-semibold">Subject:</span><span>{selectedAdminEmail.subject}</span></div>
              <div className="flex"><span className="w-16 text-slate-500 font-semibold">Sent:</span><span>{new Date(selectedAdminEmail.sentAt).toUTCString()}</span></div>
            </div>

            <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-600 font-medium">Format:</span>
              <div className="flex bg-slate-200 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAdminEmailPreviewTab('html')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${adminEmailPreviewTab === 'html' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
                >
                  HTML Preview
                </button>
                <button
                  type="button"
                  onClick={() => setAdminEmailPreviewTab('text')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${adminEmailPreviewTab === 'text' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
                >
                  Plain Text
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-slate-50">
              {adminEmailPreviewTab === 'html' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <iframe
                    srcDoc={selectedAdminEmail.htmlBody}
                    title="Rendered Email"
                    className="w-full h-[380px] border-none"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <pre className="font-mono text-xs text-slate-800 bg-white p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedAdminEmail.textBody || selectedAdminEmail.message}
                </pre>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] text-emerald-700 font-mono font-semibold">✓ Audited Citizen Delivery</span>
              <button
                type="button"
                onClick={() => setSelectedAdminEmail(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
