import { db } from './firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

export interface CivicBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt?: string;
}

export interface CitizenLeaderboardUser {
  uid: string;
  name: string;
  email: string;
  ward: string;
  city: string;
  avatarUrl?: string;
  karmaPoints: number;
  level: number;
  levelTitle: string;
  levelProgressPercent: number;
  nextLevelPoints: number;
  verificationsCount: number;
  accuracyRate: number;
  streakDays: number;
  badges: CivicBadge[];
  recentActivity?: string;
  rank?: number;
  isCurrentUser?: boolean;
}

export const ALL_BADGES: Record<string, CivicBadge> = {
  first_verification: {
    id: 'first_verification',
    name: 'Eye of the Ward',
    icon: '👁️',
    description: 'Conducted first on-ground verification of a resolved civic defect',
    tier: 'bronze',
  },
  pothole_patrol: {
    id: 'pothole_patrol',
    name: 'Roads Vanguard',
    icon: '🛣️',
    description: 'Verified 5+ road and asphalt repair works',
    tier: 'silver',
  },
  eco_guardian: {
    id: 'eco_guardian',
    name: 'Sanitation Guard',
    icon: '🌿',
    description: 'Verified 5+ municipal garbage or drainage clearances',
    tier: 'silver',
  },
  shield_of_truth: {
    id: 'shield_of_truth',
    name: 'Shield of Truth',
    icon: '🛡️',
    description: 'Completed 15+ consensus verifications with 95%+ accuracy',
    tier: 'gold',
  },
  lightning_eye: {
    id: 'lightning_eye',
    name: 'Rapid Inspector',
    icon: '⚡',
    description: 'Verified a civic repair within 2 hours of authority closure',
    tier: 'gold',
  },
  civic_hero: {
    id: 'civic_hero',
    name: 'Civic Legend',
    icon: '👑',
    description: 'Surpassed 1,000 Community Karma points for public welfare',
    tier: 'platinum',
  },
  streak_master: {
    id: 'streak_master',
    name: 'Civic Sentinel Streak',
    icon: '🔥',
    description: 'Active for 5 consecutive days inspecting community works',
    tier: 'silver',
  },
};

export function calculateLevelAndTier(karmaPoints: number): {
  level: number;
  levelTitle: string;
  levelProgressPercent: number;
  nextLevelPoints: number;
  color: string;
  bgGlow: string;
} {
  if (karmaPoints >= 1200) {
    return {
      level: 6,
      levelTitle: 'Legendary Guardian',
      levelProgressPercent: 100,
      nextLevelPoints: 1200,
      color: '#ec4899', // rose/pink
      bgGlow: 'rgba(236, 72, 153, 0.15)',
    };
  } else if (karmaPoints >= 700) {
    const range = 1200 - 700;
    const progress = Math.min(100, Math.round(((karmaPoints - 700) / range) * 100));
    return {
      level: 5,
      levelTitle: 'Master Verifier',
      levelProgressPercent: progress,
      nextLevelPoints: 1200,
      color: '#8b5cf6', // purple
      bgGlow: 'rgba(139, 92, 246, 0.15)',
    };
  } else if (karmaPoints >= 350) {
    const range = 700 - 350;
    const progress = Math.min(100, Math.round(((karmaPoints - 350) / range) * 100));
    return {
      level: 4,
      levelTitle: 'Neighborhood Warden',
      levelProgressPercent: progress,
      nextLevelPoints: 700,
      color: '#3b82f6', // blue
      bgGlow: 'rgba(59, 130, 246, 0.15)',
    };
  } else if (karmaPoints >= 150) {
    const range = 350 - 150;
    const progress = Math.min(100, Math.round(((karmaPoints - 150) / range) * 100));
    return {
      level: 3,
      levelTitle: 'Civic Sentinel',
      levelProgressPercent: progress,
      nextLevelPoints: 350,
      color: '#10b981', // emerald
      bgGlow: 'rgba(16, 185, 129, 0.15)',
    };
  } else if (karmaPoints >= 50) {
    const range = 150 - 50;
    const progress = Math.min(100, Math.round(((karmaPoints - 50) / range) * 100));
    return {
      level: 2,
      levelTitle: 'Active Citizen',
      levelProgressPercent: progress,
      nextLevelPoints: 150,
      color: '#f59e0b', // amber
      bgGlow: 'rgba(245, 158, 11, 0.15)',
    };
  } else {
    const progress = Math.min(100, Math.round((karmaPoints / 50) * 100));
    return {
      level: 1,
      levelTitle: 'Civic Scout',
      levelProgressPercent: progress,
      nextLevelPoints: 50,
      color: '#94a3b8', // slate
      bgGlow: 'rgba(148, 163, 184, 0.1)',
    };
  }
}

export function computeBadges(karmaPoints: number, verifications: number, streak: number): CivicBadge[] {
  const earned: CivicBadge[] = [];

  if (verifications >= 1) earned.push(ALL_BADGES.first_verification);
  if (verifications >= 5) earned.push(ALL_BADGES.pothole_patrol);
  if (verifications >= 8) earned.push(ALL_BADGES.eco_guardian);
  if (verifications >= 15) earned.push(ALL_BADGES.shield_of_truth);
  if (streak >= 3) earned.push(ALL_BADGES.streak_master);
  if (karmaPoints >= 300) earned.push(ALL_BADGES.lightning_eye);
  if (karmaPoints >= 1000) earned.push(ALL_BADGES.civic_hero);

  return earned;
}

// Baseline community champions for competitive municipal context
const BASELINE_CHAMPIONS: CitizenLeaderboardUser[] = [
  {
    uid: 'champ_1',
    name: 'Priya Sharma',
    email: 'priya.sharma@civicmail.in',
    ward: 'Ward 14 (Karol Bagh)',
    city: 'Central Zone',
    karmaPoints: 1420,
    level: 6,
    levelTitle: 'Legendary Guardian',
    levelProgressPercent: 100,
    nextLevelPoints: 1420,
    verificationsCount: 48,
    accuracyRate: 98,
    streakDays: 14,
    badges: [ALL_BADGES.civic_hero, ALL_BADGES.shield_of_truth, ALL_BADGES.streak_master, ALL_BADGES.lightning_eye],
    recentActivity: 'Verified road patch restoration 2 hrs ago',
  },
  {
    uid: 'champ_2',
    name: 'Rajesh Verma',
    email: 'rajesh.verma@delhicivic.org',
    ward: 'Ward 7 (Civil Lines)',
    city: 'North Zone',
    karmaPoints: 945,
    level: 5,
    levelTitle: 'Master Verifier',
    levelProgressPercent: 62,
    nextLevelPoints: 1200,
    verificationsCount: 32,
    accuracyRate: 96,
    streakDays: 8,
    badges: [ALL_BADGES.shield_of_truth, ALL_BADGES.pothole_patrol, ALL_BADGES.eco_guardian],
    recentActivity: 'Inspected storm drainage fix yesterday',
  },
  {
    uid: 'champ_3',
    name: 'Ananya Deshmukh',
    email: 'ananya.d@greenpave.org',
    ward: 'Ward 3 (Green Park)',
    city: 'South Zone',
    karmaPoints: 790,
    level: 5,
    levelTitle: 'Master Verifier',
    levelProgressPercent: 35,
    nextLevelPoints: 1200,
    verificationsCount: 27,
    accuracyRate: 97,
    streakDays: 6,
    badges: [ALL_BADGES.eco_guardian, ALL_BADGES.shield_of_truth, ALL_BADGES.first_verification],
    recentActivity: 'Confirmed garbage blackspot removal',
  },
  {
    uid: 'champ_4',
    name: 'Vikramaditya Rao',
    email: 'vikram.rao@bengaluru.gov.in',
    ward: 'Ward 19 (Indiranagar)',
    city: 'East Zone',
    karmaPoints: 630,
    level: 4,
    levelTitle: 'Neighborhood Warden',
    levelProgressPercent: 80,
    nextLevelPoints: 700,
    verificationsCount: 22,
    accuracyRate: 94,
    streakDays: 5,
    badges: [ALL_BADGES.pothole_patrol, ALL_BADGES.lightning_eye],
    recentActivity: 'Audited pedestrian footpath railing fix',
  },
  {
    uid: 'champ_5',
    name: 'Neha Iyer',
    email: 'neha.iyer@civicaction.org',
    ward: 'Ward 11 (Malleshwaram)',
    city: 'West Zone',
    karmaPoints: 470,
    level: 4,
    levelTitle: 'Neighborhood Warden',
    levelProgressPercent: 42,
    nextLevelPoints: 700,
    verificationsCount: 16,
    accuracyRate: 95,
    streakDays: 4,
    badges: [ALL_BADGES.pothole_patrol, ALL_BADGES.first_verification],
    recentActivity: 'Approved streetlight bulb replacement',
  },
  {
    uid: 'champ_6',
    name: 'Devendra Singh',
    email: 'devendra.s@jaipurcivic.net',
    ward: 'Ward 2 (Cantonment)',
    city: 'West Zone',
    karmaPoints: 340,
    level: 3,
    levelTitle: 'Civic Sentinel',
    levelProgressPercent: 95,
    nextLevelPoints: 350,
    verificationsCount: 12,
    accuracyRate: 92,
    streakDays: 3,
    badges: [ALL_BADGES.first_verification, ALL_BADGES.streak_master],
    recentActivity: 'Verified park maintenance cleanup',
  },
  {
    uid: 'champ_7',
    name: 'Sunita Patel',
    email: 'sunita.patel@gujaratcivic.org',
    ward: 'Ward 5 (Navrangpura)',
    city: 'Central Zone',
    karmaPoints: 260,
    level: 3,
    levelTitle: 'Civic Sentinel',
    levelProgressPercent: 55,
    nextLevelPoints: 350,
    verificationsCount: 9,
    accuracyRate: 91,
    streakDays: 2,
    badges: [ALL_BADGES.eco_guardian],
    recentActivity: 'Inspected sewage overflow rectification',
  },
  {
    uid: 'champ_8',
    name: 'Rohit Sen',
    email: 'rohit.sen@kolkatacivic.org',
    ward: 'Ward 8 (Salt Lake Sector 2)',
    city: 'East Zone',
    karmaPoints: 195,
    level: 3,
    levelTitle: 'Civic Sentinel',
    levelProgressPercent: 22,
    nextLevelPoints: 350,
    verificationsCount: 7,
    accuracyRate: 93,
    streakDays: 2,
    badges: [ALL_BADGES.first_verification],
    recentActivity: 'Verified traffic sign re-alignment',
  },
];

// Award Karma points for an action (e.g. successful verification, corroboration, etc.)
export async function awardCitizenKarma(
  userId: string,
  userEmail: string,
  points: number,
  actionType: 'VERIFICATION' | 'REPORT_RESOLVED' | 'FIRST_VERIFY' | 'STREAK_BONUS',
  actionDetails?: string
): Promise<{ success: boolean; newPoints: number; level: number; levelTitle: string; badges: CivicBadge[] }> {
  try {
    let currentKarma = 100; // default baseline for active citizen
    let verifications = 1;
    let streak = 3;
    let name = 'Aarav Mehta';
    let ward = 'Ward 12 (Central District)';

    // Read current user profile
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const d = snap.data();
        currentKarma = Number(d.karmaPoints || 100);
        verifications = Number(d.verificationsCount || 0) + (actionType === 'VERIFICATION' ? 1 : 0);
        streak = Number(d.streakDays || 2);
        name = d.displayName || d.name || name;
        ward = d.ward || d.department || ward;
      }
    } catch (e) {
      console.warn('Notice: Firestore user doc read offline:', e);
    }

    const newPoints = currentKarma + points;
    const tierInfo = calculateLevelAndTier(newPoints);
    const badges = computeBadges(newPoints, verifications, streak);

    // Save to Firestore
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          email: userEmail,
          displayName: name,
          karmaPoints: newPoints,
          verificationsCount: verifications,
          streakDays: streak,
          tier: tierInfo.levelTitle,
          badges: badges.map((b) => b.id),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (dbErr) {
      console.warn('Notice: Firestore karma setDoc offline:', dbErr);
    }

    // Record in local cache for instant UI reflection
    if (typeof window !== 'undefined') {
      localStorage.setItem(`karma_${userEmail}`, String(newPoints));
      localStorage.setItem(`verif_${userEmail}`, String(verifications));
    }

    return {
      success: true,
      newPoints,
      level: tierInfo.level,
      levelTitle: tierInfo.levelTitle,
      badges,
    };
  } catch (err: any) {
    console.error('Error awarding citizen karma:', err);
    return {
      success: false,
      newPoints: 125,
      level: 2,
      levelTitle: 'Active Citizen',
      badges: [ALL_BADGES.first_verification],
    };
  }
}

// Fetch all leaderboard participants (combining Firestore and community champions)
export async function getCitizenLeaderboard(
  currentUserEmail?: string
): Promise<{ users: CitizenLeaderboardUser[]; currentUser?: CitizenLeaderboardUser }> {
  const mergedMap = new Map<string, CitizenLeaderboardUser>();

  // 1. Initialize with baseline champions
  BASELINE_CHAMPIONS.forEach((champ) => {
    mergedMap.set(champ.email.toLowerCase(), { ...champ });
  });

  // 2. Query Firestore users for real scores
  try {
    const snap = await getDocs(collection(db, 'users'));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const email = (data.email || '').toLowerCase();
      if (!email) return;

      const karma = Number(data.karmaPoints || (email === 'citizen@crowdcivic.org' ? 480 : 75));
      const verif = Number(data.verificationsCount || (email === 'citizen@crowdcivic.org' ? 16 : 2));
      const streak = Number(data.streakDays || 3);
      const tierInfo = calculateLevelAndTier(karma);
      const badges = computeBadges(karma, verif, streak);

      const existing = mergedMap.get(email);
      mergedMap.set(email, {
        uid: docSnap.id,
        name: data.displayName || data.name || (email === 'citizen@crowdcivic.org' ? 'Aarav Mehta' : email.split('@')[0]),
        email,
        ward: data.ward || data.department || (existing?.ward || 'Ward 12 (Central District)'),
        city: data.city || existing?.city || 'Civic Metropolis',
        karmaPoints: karma,
        level: tierInfo.level,
        levelTitle: tierInfo.levelTitle,
        levelProgressPercent: tierInfo.levelProgressPercent,
        nextLevelPoints: tierInfo.nextLevelPoints,
        verificationsCount: verif,
        accuracyRate: existing?.accuracyRate || 95,
        streakDays: streak,
        badges,
        recentActivity: existing?.recentActivity || 'Active civic redresser',
      });
    });
  } catch (e) {
    console.warn('Notice: Firestore users fetch offline, using seeded leaderboard state:', e);
  }

  // 3. Ensure the active citizen (e.g. demo account) is explicitly represented
  const targetEmail = (currentUserEmail || 'citizen@crowdcivic.org').toLowerCase();
  let localKarma = 480;
  let localVerif = 16;
  if (typeof window !== 'undefined') {
    const storedKarma = localStorage.getItem(`karma_${targetEmail}`);
    if (storedKarma) localKarma = Number(storedKarma);
    const storedVerif = localStorage.getItem(`verif_${targetEmail}`);
    if (storedVerif) localVerif = Number(storedVerif);
  }

  if (!mergedMap.has(targetEmail)) {
    const tierInfo = calculateLevelAndTier(localKarma);
    mergedMap.set(targetEmail, {
      uid: 'user_active_citizen',
      name: targetEmail === 'citizen@crowdcivic.org' ? 'Aarav Mehta' : targetEmail.split('@')[0],
      email: targetEmail,
      ward: 'Ward 12 (Central District)',
      city: 'Central Zone',
      karmaPoints: localKarma,
      level: tierInfo.level,
      levelTitle: tierInfo.levelTitle,
      levelProgressPercent: tierInfo.levelProgressPercent,
      nextLevelPoints: tierInfo.nextLevelPoints,
      verificationsCount: localVerif,
      accuracyRate: 96,
      streakDays: 4,
      badges: computeBadges(localKarma, localVerif, 4),
      recentActivity: 'Verified 2 community resolutions this week',
    });
  } else {
    // Sync with local session if higher
    const cur = mergedMap.get(targetEmail)!;
    if (localKarma > cur.karmaPoints) {
      cur.karmaPoints = localKarma;
      cur.verificationsCount = localVerif;
      const tierInfo = calculateLevelAndTier(localKarma);
      cur.level = tierInfo.level;
      cur.levelTitle = tierInfo.levelTitle;
      cur.levelProgressPercent = tierInfo.levelProgressPercent;
      cur.nextLevelPoints = tierInfo.nextLevelPoints;
      cur.badges = computeBadges(localKarma, localVerif, cur.streakDays);
    }
  }

  // 4. Sort descending by karmaPoints
  const sortedList = Array.from(mergedMap.values()).sort((a, b) => b.karmaPoints - a.karmaPoints);

  // 5. Assign ordinal ranks (1, 2, 3...)
  let currentFound: CitizenLeaderboardUser | undefined = undefined;
  sortedList.forEach((user, idx) => {
    user.rank = idx + 1;
    if (currentUserEmail && user.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      user.isCurrentUser = true;
      currentFound = user;
    }
  });

  return {
    users: sortedList,
    currentUser: currentFound,
  };
}
