import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLogo } from './AppLogo';

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDisplayDuration = 1400,
}) => {
  const [isReadyToExit, setIsReadyToExit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReadyToExit(true);
      // Give a tiny moment for smooth exit transition
      const exitTimer = setTimeout(() => {
        onComplete();
      }, 400);
      return () => clearTimeout(exitTimer);
    }, minDisplayDuration);

    return () => clearTimeout(timer);
  }, [minDisplayDuration, onComplete]);

  return (
    <AnimatePresence>
      {!isReadyToExit && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080B18] text-[#F8FAFC] overflow-hidden select-none"
        >
          {/* Ambient background subtle lighting */}
          <div className="absolute w-[500px] h-[500px] bg-blue-900/15 rounded-full blur-3xl pointer-events-none -top-24 -left-24" />
          <div className="absolute w-[400px] h-[400px] bg-emerald-900/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

          {/* Central Animated Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center px-6"
          >
            {/* Logo with Soft Glow */}
            <div className="relative mb-6">
              {/* Soft Pulsing Ambient Glow */}
              <motion.div
                animate={{
                  opacity: [0.35, 0.65, 0.35],
                  scale: [1, 1.06, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-3xl bg-emerald-500/25 blur-2xl -z-10"
              />

              {/* Official Friends Tr$cker Logo */}
              <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] drop-shadow-2xl">
                <AppLogo
                  size="100%"
                  className="w-full h-full"
                  imgClassName="rounded-3xl shadow-2xl"
                  alt="Friends Tr$cker Official Logo"
                />
              </div>
            </div>

            {/* Application Name */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="space-y-1.5"
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5">
                <span>Friends</span>
                <span className="text-emerald-400 font-black">
                  Tr<span className="text-emerald-300">$</span>cker
                </span>
              </h1>
              <p className="text-sm sm:text-base font-medium text-slate-400 tracking-wide">
                Smart Expense Tracking
              </p>
            </motion.div>

            {/* Subtle Sequential Loading Dots Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="flex items-center gap-2 mt-8"
              aria-label="Loading application"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{
                    opacity: [0.25, 1, 0.25],
                    scale: [0.85, 1.2, 0.85],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.1,
                    delay: i * 0.22,
                    ease: 'easeInOut',
                  }}
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
