'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Zap,
  TrendingUp,
  User,
  Users,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Info,
  Shield,
  Star,
  MapPin,
  ExternalLink,
  X,
  Check,
} from 'lucide-react';
import {
  CitizenLeaderboardUser,
  CivicBadge,
  ALL_BADGES,
  getCitizenLeaderboard,
  awardCitizenKarma,
} from '@/lib/karmaService';
import CivicLogo from '@/components/CivicLogo';

interface CitizenLeaderboardProps {
  currentUserEmail?: string;
  currentUserId?: string;
  onNavigateToExplore?: () => void;
  onNavigateToReport?: () => void;
}

export default function CitizenLeaderboard({
  currentUserEmail = 'citizen@crowdcivic.org',
  currentUserId = 'usr_citizen',
  onNavigateToExplore,
  onNavigateToReport,
}: CitizenLeaderboardProps) {
  const [users, setUsers] = useState<CitizenLeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<CitizenLeaderboardUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBadgeModal, setSelectedBadgeModal] = useState<CivicBadge | null>(null);
  const [karmaAwardSuccess, setKarmaAwardSuccess] = useState<string | null>(null);
  const [simulatingVote, setSimulatingVote] = useState<boolean>(false);

  // Load leaderboard data
  const loadLeaderboardData = async () => {
    try {
      const data = await getCitizenLeaderboard(currentUserEmail);
      setUsers(data.users);
      if (data.currentUser) {
        setCurrentUser(data.currentUser);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeaderboardData();
  }, [currentUserEmail]);

  // Handle instant test verification karma simulation
  const handleQuickVerifyBonus = async () => {
    setSimulatingVote(true);
    setKarmaAwardSuccess(null);
    try {
      const result = await awardCitizenKarma(
        currentUserId,
        currentUserEmail,
        25,
        'VERIFICATION',
        'Simulated on-ground municipal repair consensus verification'
      );

      setKarmaAwardSuccess(`+25 Karma Points Awarded! You are now Level ${result.level} (${result.levelTitle}).`);
      await loadLeaderboardData();

      setTimeout(() => {
        setKarmaAwardSuccess(null);
      }, 5000);
    } catch (err) {
      console.error('Error awarding bonus:', err);
    } finally {
      setSimulatingVote(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.ward.toLowerCase().includes(q) ||
      u.levelTitle.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const top3 = users.slice(0, 3);

  return (
    <div className="space-y-8 font-sans text-slate-800">
      {/* HEADER SECTION - ENHANCED LIGHT MODE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-600 shadow-sm">
              <Trophy className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Citizen Karma Leaderboard
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Consensus Tier
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-0.5 leading-relaxed">
                Rewarding community residents who actively corroborate civic complaints, verify resolved municipal works on ground, and uphold neighborhood integrity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadLeaderboardData();
            }}
            disabled={refreshing}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
            <span>Refresh Ranks</span>
          </button>

          <button
            type="button"
            disabled={simulatingVote}
            onClick={handleQuickVerifyBonus}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 active:scale-95"
            title="Simulate verifying a civic fix to earn Karma points"
          >
            <Zap className={`w-3.5 h-3.5 ${simulatingVote ? 'animate-bounce text-amber-200' : 'text-amber-100'}`} />
            <span>{simulatingVote ? 'Verifying Repair...' : 'Earn +25 Karma'}</span>
          </button>
        </div>
      </div>

      {/* KARMA REWARD NOTIFICATION TOAST */}
      {karmaAwardSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 shadow-sm">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider font-mono block">
                Verification Bounty Unlocked
              </span>
              <p className="text-xs text-emerald-900 font-medium">{karmaAwardSuccess}</p>
            </div>
          </div>
          <button
            onClick={() => setKarmaAwardSuccess(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* LOGGED-IN CITIZEN PERSONAL GAMIFICATION HERO CARD - PURE LIGHT MODE */}
      {currentUser && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-blue-100 shadow-md relative overflow-hidden">
          {/* Subtle accent border top */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Identity & Current Rank */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20">
                  <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center text-blue-700 font-black text-2xl font-mono">
                    {currentUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-full shadow-md border-2 border-white flex items-center gap-0.5">
                  #{currentUser.rank || 1}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {currentUser.name}
                  </h2>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {currentUser.ward}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    {currentUser.levelTitle}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-700">Level {currentUser.level}</span>
                  <span className="text-slate-400">·</span>
                  <span className="flex items-center gap-1 text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                    {currentUser.streakDays} Day Streak
                  </span>
                </div>

                {/* Earned Badges Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">Earned Badges:</span>
                  {currentUser.badges.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBadgeModal(b)}
                      className="text-lg p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:scale-110 transition-transform shadow-xs cursor-pointer"
                      title={`${b.name}: ${b.description}`}
                    >
                      {b.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Score & Progress to Next Level Box */}
            <div className="lg:w-88 bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">
                    Total Karma
                  </span>
                  <span className="text-3xl font-black font-mono text-amber-600">
                    {currentUser.karmaPoints.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-semibold">pts</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">
                    Verified Works
                  </span>
                  <span className="text-xl font-bold font-mono text-slate-900 flex items-center justify-end gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    {currentUser.verificationsCount}
                  </span>
                </div>
              </div>

              {/* XP Progress Bar to next level */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium mb-1">
                  <span>Level {currentUser.level} &rarr; Level {currentUser.level + 1}</span>
                  <span className="font-mono text-slate-700">
                    {currentUser.karmaPoints} / {currentUser.nextLevelPoints} pts ({currentUser.levelProgressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${currentUser.levelProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP 3 PODIUM - LIGHT MODE WITH HIGH CONTRAST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Top Civic Champions Podium
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Ranked by Ground Verifications</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {top3.map((podiumUser, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;

            const podiumBadgeColor = isFirst
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : isSecond
              ? 'bg-slate-100 text-slate-800 border-slate-300'
              : 'bg-orange-100 text-orange-900 border-orange-200';

            const podiumTitle = isFirst ? '🥇 Gold Sentinel' : isSecond ? '🥈 Silver Warden' : '🥉 Bronze Scout';

            return (
              <div
                key={podiumUser.uid}
                className={`bg-white rounded-3xl p-6 relative transition-all flex flex-col justify-between ${
                  isFirst
                    ? 'border-2 border-amber-400 shadow-xl shadow-amber-500/10 order-first md:order-2 ring-4 ring-amber-400/10'
                    : isSecond
                    ? 'border border-slate-300 shadow-sm order-2 md:order-1'
                    : 'border border-amber-200 shadow-sm order-3 md:order-3'
                }`}
              >
                {/* Crown Rank Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 ${podiumBadgeColor}`}>
                    {podiumTitle}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    Rank #{index + 1}
                  </span>
                </div>

                {/* Avatar & Details */}
                <div className="text-center py-2 space-y-2">
                  <div
                    className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center font-bold text-xl font-mono shadow-sm ${
                      isFirst
                        ? 'bg-gradient-to-tr from-amber-400 to-amber-500 text-amber-950 border-2 border-amber-300'
                        : isSecond
                        ? 'bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-800 border-2 border-slate-300'
                        : 'bg-gradient-to-tr from-orange-200 to-amber-300 text-orange-950 border-2 border-orange-200'
                    }`}
                  >
                    {podiumUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
                      <span>{podiumUser.name}</span>
                      {podiumUser.isCurrentUser && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold font-mono">(You)</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium truncate">{podiumUser.ward}</p>
                    <span className="text-[11px] font-semibold text-blue-700">{podiumUser.levelTitle}</span>
                  </div>

                  <div className="pt-2">
                    <span className="text-3xl font-black font-mono text-amber-600">
                      {podiumUser.karmaPoints.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1">Karma</span>
                  </div>
                </div>

                {/* Metrics Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <strong>{podiumUser.verificationsCount}</strong> verified
                  </span>
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {podiumUser.accuracyRate}% Accuracy
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['all', 'month', 'week'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf === 'all' ? 'All-Time' : tf === 'month' ? 'This Month' : 'This Week'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search citizen, ward or level..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* FULL LEADERBOARD TABLE / CARDS - PURE LIGHT MODE */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
            Citizen Rankings ({filteredUsers.length} verifiers)
          </span>
          <span className="text-xs text-slate-500 font-medium">Ranked by Community Karma</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading civic leaderboard...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No citizens found matching "{searchQuery}".
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((userItem, index) => {
              const rankNum = index + 1;
              const isCurrentUser = userItem.email.toLowerCase() === currentUserEmail.toLowerCase();

              return (
                <div
                  key={userItem.uid || index}
                  className={`p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isCurrentUser ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Left: Rank & User Details */}
                  <div className="flex items-center gap-3.5">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        rankNum === 1
                          ? 'bg-amber-400 text-amber-950 shadow-sm'
                          : rankNum === 2
                          ? 'bg-slate-300 text-slate-900 shadow-sm'
                          : rankNum === 3
                          ? 'bg-amber-200 text-amber-900 shadow-sm'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rankNum}
                    </div>

                    {/* Avatar Initials */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold font-mono text-sm shrink-0">
                      {userItem.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>

                    {/* Identity Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{userItem.name}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            YOU
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {userItem.ward}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="text-emerald-700 font-semibold">{userItem.levelTitle}</span>
                        <span>·</span>
                        <span>Level {userItem.level}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-orange-600 font-medium">
                          <Flame className="w-3 h-3 fill-orange-500" />
                          {userItem.streakDays}d streak
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges & Karma Points */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 self-end sm:self-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Badges preview */}
                    <div className="flex items-center gap-1">
                      {userItem.badges.slice(0, 3).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBadgeModal(b)}
                          className="text-base p-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:scale-125 transition-transform"
                          title={`${b.name}: ${b.description}`}
                        >
                          {b.icon}
                        </button>
                      ))}
                      {userItem.badges.length > 3 && (
                        <span className="text-[10px] font-mono text-slate-500 font-bold ml-0.5">
                          +{userItem.badges.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Verifications Count */}
                    <div className="text-right hidden md:block">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                        Works Verified
                      </span>
                      <span className="font-mono font-bold text-slate-700 text-xs">
                        {userItem.verificationsCount} checks
                      </span>
                    </div>

                    {/* Karma Score */}
                    <div className="text-right min-w-[90px]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                        Karma Points
                      </span>
                      <span className="font-mono font-extrabold text-amber-600 text-lg">
                        {userItem.karmaPoints.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BADGE INSPECTION MODAL */}
      {selectedBadgeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedBadgeModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-4xl mx-auto shadow-sm">
                {selectedBadgeModal.icon}
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 inline-block mb-1">
                  {selectedBadgeModal.tier} Tier Badge
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedBadgeModal.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {selectedBadgeModal.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBadgeModal(null)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Close Badge Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
