import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { MemberName, Expense } from '../types';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import {
  GamificationProfile,
  calculateGamificationProfile,
  calculateLeaderboard,
  LeaderboardMemberStats
} from '../utils/gamification';
import { triggerStreakCelebration } from '../utils/confetti';
import {
  X,
  Flame,
  Trophy,
  Crown,
  Check,
  Zap,
  Star,
  Target,
  BarChart3,
  Award,
  Users,
  Sparkles,
  ChevronDown,
  MoreVertical,
  TrendingUp
} from 'lucide-react';

export interface MyProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: MemberName;
  profile?: GamificationProfile;
  expenses?: Expense[];
  dailyTarget?: number;
  onUpdateProfile?: () => void;
}

export const MyProgressModal: React.FC<MyProgressModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  profile: propProfile,
  expenses = [],
  dailyTarget = 200,
}) => {
  const { getMember } = useMemberAvatars();
  const currentMemberObj = getMember(currentMember);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'leaderboard'>('overview');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'this_month' | 'last_month' | 'all_time'>('this_month');

  const profile = useMemo(() => {
    if (propProfile) return propProfile;
    return calculateGamificationProfile(expenses, currentMember, dailyTarget);
  }, [propProfile, expenses, currentMember, dailyTarget]);

  const leaderboardStats = useMemo(() => {
    return calculateLeaderboard(expenses, currentMember, leaderboardPeriod, dailyTarget);
  }, [expenses, currentMember, leaderboardPeriod, dailyTarget]);

  if (!isOpen) return null;

  const unlockedAchievementsCount = (profile?.achievements || []).filter(a => a.isUnlocked).length;
  const xpRemainingForNextLevel = Math.max((profile?.nextLevelXp || 100) - (profile?.totalXp || 0), 0);

  const top3 = leaderboardStats.slice(0, 3);
  const rank1 = top3.find(s => s.rank === 1);
  const rank2 = top3.find(s => s.rank === 2);
  const rank3 = top3.find(s => s.rank === 3);

  const currentUserRankStats = leaderboardStats.find(s => s.isCurrentUser);
  const isUserInTop3 = currentUserRankStats && currentUserRankStats.rank <= 3;

  return (
    <div className="fixed inset-0 z-50 min-h-screen flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:via-[#131E3A] dark:to-slate-900 relative">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <div
                className={`w-11 h-11 rounded-2xl ${
                  currentMemberObj.avatarUrl ? 'bg-slate-200 dark:bg-slate-800' : currentMemberObj.avatarColor
                } flex items-center justify-center font-bold text-base text-white shadow-md overflow-hidden`}
              >
                {currentMemberObj.avatarUrl ? (
                  <img
                    src={currentMemberObj.avatarUrl}
                    alt={currentMember}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  currentMemberObj.avatarLetter
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-md shadow-xs border border-amber-300">
                LVL {profile.level}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                  {currentMember}&apos;s Progress
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shrink-0">
                  Tr$cker Member
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Level {profile.level} • {profile.totalXp} Total XP Earned
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800/80 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-[#0B1120]">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('achievements')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'achievements'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>Badges</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>Leaderboard</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-white dark:bg-[#0F172A]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Level Progress Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-gradient-to-br dark:from-indigo-950/60 dark:via-slate-900 dark:to-slate-950 border border-indigo-200 dark:border-indigo-900/40 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600/20 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-300 dark:border-indigo-500/30 shrink-0">
                      ⭐
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">LEVEL {profile.level}</h4>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-500/30 px-2 py-0.5 rounded-md">
                    CURRENT RANK
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm sm:text-base font-mono font-bold text-cyan-700 dark:text-cyan-400">
                      {profile.totalXp} / {profile.nextLevelXp} XP
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({xpRemainingForNextLevel} XP to Lvl {profile.level + 1})
                    </span>
                  </div>
                </div>

                {/* Animated XP Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-700"
                      style={{ width: `${Math.max(profile.levelProgressPct, 8)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                    <span>Level {profile.level}</span>
                    <span>{profile.levelProgressPct}% to Level {profile.level + 1}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stat Pill Highlights - Equal 3-Column Grid */}
              <div className="grid grid-cols-3 gap-2.5 my-4">
                <button
                  type="button"
                  onClick={() => triggerStreakCelebration(profile.currentStreak)}
                  title="Celebrate active streak!"
                  className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200/80 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500/40 flex flex-col items-center justify-center text-center space-y-1 transition-all cursor-pointer group active:scale-95 h-full"
                >
                  <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400 text-xs font-bold group-hover:scale-105 transition-transform">
                    <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                    <span>Budget Streak</span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono block">
                    {profile.currentStreak} Days
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors">
                    {profile.currentStreak >= 3 ? '🎉 Tap for confetti' : profile.isMissedToday ? '⚠️ Over budget' : 'Active'}
                  </span>
                </button>

                <div
                  onClick={() => setActiveTab('achievements')}
                  className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200/80 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/40 flex flex-col items-center justify-center text-center space-y-1 transition-all cursor-pointer h-full"
                >
                  <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                    <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Badges</span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono block">
                    {unlockedAchievementsCount} / {profile.achievements.length}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Unlocked</span>
                </div>

                <div
                  onClick={() => setActiveTab('leaderboard')}
                  className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200/80 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 flex flex-col items-center justify-center text-center space-y-1 transition-all cursor-pointer h-full"
                >
                  <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Leaderboard</span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono block">
                    {currentUserRankStats ? `#${currentUserRankStats.rank}` : 'Top 5'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {currentUserRankStats ? `${currentUserRankStats.successRate}% Rate` : 'Rankings'}
                  </span>
                </div>
              </div>

              {/* XP Earning Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  HOW TO EARN TR$CKER XP
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between py-2.5 border-b border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Stay within daily budget</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-xs">+10 XP</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Confirm ₹0 Spend Day</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-xs">+10 XP</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">7-Day Streak Bonus</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-xs">+50 XP</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-slate-200 dark:border-slate-800/60 last:border-none">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">30-Day Budget Master</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-xs">+150 XP</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACHIEVEMENTS / BADGES */}
          {activeTab === 'achievements' && (
            <div className="space-y-2.5">
              {profile.achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    ach.isUnlocked
                      ? 'bg-amber-50/60 dark:bg-slate-900/90 border-amber-300 dark:border-amber-500/30'
                      : 'bg-slate-100/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-80 dark:opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0 flex items-center justify-center">{ach.icon}</span>
                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{ach.title}</h4>
                        {ach.isUnlocked && (
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 inline-flex items-center gap-0.5 shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> UNLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{ach.description}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end justify-center">
                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 block px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 whitespace-nowrap">
                      +{ach.xpReward} XP
                    </span>
                    {!ach.isUnlocked && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono block mt-0.5">
                        {ach.progress}/{ach.target}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              {/* Leaderboard Top Controls Row */}
              <div className="flex items-center justify-between px-1 pt-1">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>👑</span> Leaderboard
                </h4>

                {/* Period Filter Dropdown */}
                <div className="relative shrink-0">
                  <select
                    value={leaderboardPeriod}
                    onChange={(e) => setLeaderboardPeriod(e.target.value as any)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                  >
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="all_time">All Time</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* TOP 3 PODIUM CARDS */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 items-end pt-7 pb-2 overflow-visible relative">
                {/* #2 SILVER (LEFT) */}
                {rank2 ? (
                  <div className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col items-center text-center space-y-2 relative overflow-visible justify-between ${
                    rank2.isCurrentUser
                      ? 'bg-slate-100 dark:bg-gradient-to-b dark:from-slate-800/90 dark:via-slate-900 dark:to-slate-950 border-slate-400 dark:border-slate-300 ring-2 ring-slate-400/40 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/80'
                  }`}>
                    <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-slate-400 dark:text-slate-300 fill-slate-300/30 dark:fill-slate-300/20 drop-shadow-[0_2px_8px_rgba(148,163,184,0.6)]" />
                    </div>

                    <div className="relative my-0.5 mt-2 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-300 overflow-hidden flex items-center justify-center font-bold text-slate-800 dark:text-white shadow-xs">
                        {getMember(rank2.member).avatarUrl ? (
                          <img src={getMember(rank2.member).avatarUrl} alt={rank2.member} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          getMember(rank2.member).avatarLetter
                        )}
                      </div>
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-slate-200 shadow-xs z-10">
                        #2
                      </span>
                    </div>

                    <div className="w-full text-center px-0.5">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {rank2.member}
                        </span>
                        {rank2.isCurrentUser && (
                          <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 font-mono block leading-tight mt-1">
                        ₹{rank2.totalPersonalExpense.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : <div />}

                {/* #1 GOLD CROWN (CENTER) */}
                {rank1 ? (
                  <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col items-center text-center space-y-2 relative -mt-4 shadow-xl overflow-visible z-10 justify-between ${
                    rank1.isCurrentUser
                      ? 'bg-amber-50 dark:bg-gradient-to-b dark:from-amber-950/80 dark:via-slate-900 dark:to-slate-950 border-amber-400 dark:border-amber-400/80 ring-2 ring-amber-400/50 shadow-amber-500/20'
                      : 'bg-amber-50/80 dark:bg-gradient-to-b dark:from-amber-950/50 dark:via-slate-900 dark:to-slate-950 border-amber-400/80 shadow-amber-500/10'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300/80 absolute top-2 right-2 animate-pulse pointer-events-none" />
                    <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400/60 absolute bottom-3 left-2 animate-pulse pointer-events-none" />

                    <div className="absolute -top-5.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-amber-500 dark:text-amber-400 fill-amber-400/30 dark:fill-amber-400/20 drop-shadow-[0_2px_10px_rgba(245,158,11,0.8)] animate-bounce" />
                    </div>

                    <div className="relative my-0.5 mt-2 flex flex-col items-center justify-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-500 dark:border-amber-400 overflow-hidden flex items-center justify-center font-extrabold text-slate-900 dark:text-white shadow-md">
                        {getMember(rank1.member).avatarUrl ? (
                          <img src={getMember(rank1.member).avatarUrl} alt={rank1.member} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          getMember(rank1.member).avatarLetter
                        )}
                      </div>
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-amber-300 shadow-xs z-20">
                        #1
                      </span>
                    </div>

                    <div className="w-full text-center px-0.5">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {rank1.member}
                        </span>
                        {rank1.isCurrentUser && (
                          <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-sm sm:text-base font-extrabold text-amber-700 dark:text-amber-300 font-mono block leading-tight mt-1">
                        ₹{rank1.totalPersonalExpense.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : <div />}

                {/* #3 BRONZE (RIGHT) */}
                {rank3 ? (
                  <div className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col items-center text-center space-y-2 relative overflow-visible justify-between ${
                    rank3.isCurrentUser
                      ? 'bg-amber-50/60 dark:bg-gradient-to-b dark:from-amber-950/60 dark:via-slate-900 dark:to-slate-950 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/40 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-900/90 border-amber-300 dark:border-amber-800/60'
                  }`}>
                    <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-amber-700 dark:text-amber-600 fill-amber-700/30 dark:fill-amber-600/20 drop-shadow-[0_2px_8px_rgba(217,119,6,0.6)]" />
                    </div>

                    <div className="relative my-0.5 mt-2 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-amber-600 dark:border-amber-700 overflow-hidden flex items-center justify-center font-bold text-slate-800 dark:text-white shadow-xs">
                        {getMember(rank3.member).avatarUrl ? (
                          <img src={getMember(rank3.member).avatarUrl} alt={rank3.member} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          getMember(rank3.member).avatarLetter
                        )}
                      </div>
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-amber-700 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-amber-600 shadow-xs z-10">
                        #3
                      </span>
                    </div>

                    <div className="w-full text-center px-0.5">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {rank3.member}
                        </span>
                        {rank3.isCurrentUser && (
                          <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-amber-800 dark:text-amber-200/90 font-mono block leading-tight mt-1">
                        ₹{rank3.totalPersonalExpense.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : <div />}
              </div>

              {/* OTHER MEMBERS (#4 and below) */}
              <div className="space-y-2 pt-2">
                <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Other Members
                </h5>

                {leaderboardStats.filter(item => item.rank >= 4).length > 0 ? (
                  <div className="space-y-1.5">
                    {leaderboardStats.filter(item => item.rank >= 4).map((item) => (
                      <div
                        key={item.member}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all ${
                          item.isCurrentUser
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/40'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Number */}
                          <span className="font-mono font-bold text-slate-500 dark:text-slate-400 text-xs w-6 text-center shrink-0">
                            #{item.rank}
                          </span>

                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-800 dark:text-white text-xs overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                            {getMember(item.member).avatarUrl ? (
                              <img src={getMember(item.member).avatarUrl} alt={item.member} className="w-full h-full object-cover" />
                            ) : (
                              getMember(item.member).avatarLetter
                            )}
                          </div>

                          {/* Name + subtle YOU indicator */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                              {item.member}
                            </span>
                            {item.isCurrentUser && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 shrink-0">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expense */}
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            ₹{item.totalPersonalExpense.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    All members are currently featured in the top podium!
                  </div>
                )}
              </div>

              {/* BOTTOM MOTIVATION & YOUR RANK CARD */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/80 dark:bg-gradient-to-r dark:from-slate-900 dark:via-indigo-950/60 dark:to-slate-900 border border-indigo-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-md mt-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shrink-0 border border-indigo-200 dark:border-indigo-500/20">
                    🎯
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Lowest expense wins!
                    </h5>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Track personal expenses to move up the ranks.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-purple-100 dark:bg-purple-900/50 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-200 flex items-center gap-2.5 shrink-0 shadow-inner">
                  <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-300 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block leading-tight">
                      Your Rank
                    </span>
                    <span className="text-base sm:text-lg font-black text-purple-950 dark:text-white font-mono leading-none">
                      #{currentUserRankStats ? currentUserRankStats.rank : 1}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-6 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-medium text-sm transition-colors cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
