import confetti from 'canvas-confetti';

/**
 * Trigger celebratory confetti effects for streak milestones (e.g. 3, 7, 30 days)
 */
export function triggerStreakCelebration(streakDays: number): void {
  // If streak is 30 days or more (Grand Budget Master Celebration)
  if (streakDays >= 30) {
    // Elegant dual burst from left & right sides
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
      colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#38BDF8', '#FCD34D']
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
    return;
  }

  // If streak is 7 days (7-Day Saver Celebration)
  if (streakDays >= 7) {
    // Golden & Emerald celebratory burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#10B981', '#34D399', '#F59E0B', '#FBBF24', '#6366F1', '#A7F3D0'],
      ticks: 200,
      gravity: 1.1,
      scalar: 0.9,
      zIndex: 9999
    });
    return;
  }

  // If streak is 3 days (3-Day Starter Milestone)
  if (streakDays >= 3) {
    // Subtle gentle pop of celebratory sparklers
    confetti({
      particleCount: 45,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#F97316', '#FBBF24', '#38BDF8', '#34D399'],
      ticks: 160,
      gravity: 1.2,
      scalar: 0.75,
      zIndex: 9999
    });
    return;
  }
}

/**
 * Check if the user has already seen the celebration today for this milestone
 * to avoid repetitive triggering on rapid re-renders.
 */
const STORAGE_KEY_SEEN_STREAK_CELEBRATION = 'friends_expense_celebrated_streak_v1';

export function checkAndTriggerStreakMilestoneCelebration(member: string, streakDays: number): boolean {
  if (streakDays < 3) return false;

  // Determine current milestone bracket (3, 7, 30)
  let milestoneBracket = 0;
  if (streakDays >= 30) milestoneBracket = 30;
  else if (streakDays >= 7) milestoneBracket = 7;
  else if (streakDays >= 3) milestoneBracket = 3;

  if (milestoneBracket === 0) return false;

  const todayStr = new Date().toISOString().substring(0, 10);
  const cacheKey = `${member}_${milestoneBracket}_${todayStr}`;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEEN_STREAK_CELEBRATION);
    const seenMap: Record<string, boolean> = raw ? JSON.parse(raw) : {};

    if (seenMap[cacheKey]) {
      return false; // Already celebrated today
    }

    // Mark as celebrated
    seenMap[cacheKey] = true;
    localStorage.setItem(STORAGE_KEY_SEEN_STREAK_CELEBRATION, JSON.stringify(seenMap));

    // Trigger animation
    triggerStreakCelebration(milestoneBracket);
    return true;
  } catch (e) {
    console.warn('Error checking streak celebration:', e);
    triggerStreakCelebration(milestoneBracket);
    return true;
  }
}
