import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  userId: string;
  email: string;
  role: 'citizen' | 'authority' | 'admin' | 'guest';
  action:
    | 'LOGIN_SUCCESS'
    | 'SIGNUP_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGIN_CREDENTIAL_MISMATCH'
    | 'UNAUTHORIZED_PORTAL_ATTEMPT'
    | 'SECURITY_PIN_VERIFIED'
    | 'SECURITY_PIN_FAILED'
    | 'ISSUE_STATUS_UPDATED'
    | 'ROLE_PERMISSIONS_CHANGED'
    | 'SESSION_LOCKED'
    | 'ADMIN_ISSUE_FLAGGED'
    | 'ADMIN_ISSUE_UNFLAGGED'
    | 'ADMIN_DELETE_ISSUE'
    | 'EMERGENCY_CREW_DISPATCHED';
  portal: 'auth' | 'citizen' | 'authority' | 'admin';
  status: 'SUCCESS' | 'DENIED' | 'WARNING';
  details: string;
  deviceInfo?: string;
  // SHA-256 tamper-proof chain fields
  sha256Hash?: string;
  previousHash?: string;
}

const LOCAL_AUDIT_KEY = 'crowdcivic_security_audit_logs';
const CHAIN_GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';

export const DEFAULT_PIN_AUTHORITY = '123456';
export const DEFAULT_PIN_ADMIN = '999999';

function getClientDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Web Client';
  const platform = navigator.platform || 'Web';
  const uaSnippet = navigator.userAgent ? navigator.userAgent.slice(0, 40) : '';
  return `${platform} (${uaSnippet}...)`;
}

// SHA-256 hash using browser-native crypto.subtle (zero dependencies)
async function sha256(data: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback: simple non-crypto hash for SSR/non-browser environments
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get the last hash from localStorage chain
function getLastChainHash(): string {
  if (typeof window === 'undefined') return CHAIN_GENESIS;
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    if (!raw) return CHAIN_GENESIS;
    const logs: AuditLogEntry[] = JSON.parse(raw);
    // logs[0] is most recent (unshifted), so it has the latest hash
    return logs[0]?.sha256Hash || CHAIN_GENESIS;
  } catch {
    return CHAIN_GENESIS;
  }
}

// Build the string to hash for a log entry
function buildHashContent(entry: AuditLogEntry, previousHash: string): string {
  return `${entry.timestamp}|${entry.userId}|${entry.email}|${entry.action}|${entry.status}|${entry.details}|${previousHash}`;
}

export async function logSecurityEvent(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  const timestamp = new Date().toISOString();
  const previousHash = getLastChainHash();

  const baseEntry: AuditLogEntry = {
    ...entry,
    timestamp,
    deviceInfo: getClientDeviceInfo(),
    previousHash,
  };

  // Compute SHA-256 hash of this entry chained with previous hash
  const hashContent = buildHashContent(baseEntry, previousHash);
  const sha256Hash = await sha256(hashContent);
  const fullEntry: AuditLogEntry = { ...baseEntry, sha256Hash };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
      const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
      logs.unshift(fullEntry);
      localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  try {
    await addDoc(collection(db, 'auditLogs'), fullEntry);
  } catch (err) {
    console.warn('Firestore auditLog write warning:', err);
  }
}

export async function getSecurityAuditLogs(maxEntries = 50): Promise<AuditLogEntry[]> {
  const logsMap = new Map<string, AuditLogEntry>();

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
      if (raw) {
        const localLogs = JSON.parse(raw);
        if (Array.isArray(localLogs)) {
          localLogs.forEach((log: any) => {
            const timestamp = log?.timestamp || new Date().toISOString();
            const email = log?.email || 'system@crowdcivic.org';
            const action = log?.action || 'AUDIT_EVENT';
            const key = `${timestamp}_${email}_${action}`;
            logsMap.set(key, {
              id: log?.id || `local_${Math.random()}`,
              timestamp,
              userId: log?.userId || 'unknown',
              email,
              role: log?.role || 'guest',
              action,
              portal: log?.portal || 'auth',
              status: log?.status || 'SUCCESS',
              details: log?.details || '',
              deviceInfo: log?.deviceInfo || '',
              sha256Hash: log?.sha256Hash || '',
              previousHash: log?.previousHash || CHAIN_GENESIS,
            });
          });
        }
      }
    } catch {
      // Ignore storage error
    }
  }

  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(maxEntries));
    const querySnap = await getDocs(q);
    querySnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const timestamp = data?.timestamp || new Date().toISOString();
      const email = data?.email || 'system@crowdcivic.org';
      const action = data?.action || 'AUDIT_EVENT';
      const key = `${timestamp}_${email}_${action}`;
      logsMap.set(key, {
        ...data,
        id: docSnap.id,
        timestamp,
        userId: data?.userId || 'unknown',
        email,
        role: data?.role || 'guest',
        action,
        portal: data?.portal || 'auth',
        status: data?.status || 'SUCCESS',
        details: data?.details || '',
        deviceInfo: data?.deviceInfo || '',
        sha256Hash: data?.sha256Hash || '',
        previousHash: data?.previousHash || CHAIN_GENESIS,
      });
    });
  } catch (err) {
    console.warn('Firestore auditLogs read warning:', err);
  }

  const combined = Array.from(logsMap.values());
  combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return combined.slice(0, maxEntries);
}

// Verify integrity of the audit chain — returns true if chain is unbroken
export async function verifyAuditChain(logs: AuditLogEntry[]): Promise<{
  valid: boolean;
  brokenAt?: number;
  totalChecked: number;
}> {
  // logs must be sorted oldest-first for chain verification
  const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (!entry.sha256Hash) continue; // skip legacy entries without hash
    const expectedPrev = i === 0 ? CHAIN_GENESIS : (sorted[i - 1].sha256Hash || CHAIN_GENESIS);
    const hashContent = buildHashContent(entry, expectedPrev);
    const recomputed = await sha256(hashContent);
    if (recomputed !== entry.sha256Hash) {
      return { valid: false, brokenAt: i, totalChecked: i + 1 };
    }
  }
  return { valid: true, totalChecked: sorted.length };
}
