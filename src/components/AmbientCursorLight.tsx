import React, { useEffect, useRef, useState } from 'react';

export const AmbientCursorLight: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -500, y: -500 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Check if desktop with mouse/fine pointer and not prefers-reduced-motion
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!hasFinePointer || prefersReducedMotion) {
      return;
    }

    setIsEnabled(true);

    const handleMouseMove = (e: MouseEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (spotlightRef.current) {
            spotlightRef.current.style.setProperty('--cursor-x', `${posRef.current.x}px`);
            spotlightRef.current.style.setProperty('--cursor-y', `${posRef.current.y}px`);
            spotlightRef.current.style.opacity = '1';
          }
          rafRef.current = null;
        });
      }
    };

    const handleMouseLeave = () => {
      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!isEnabled) return null;

  return (
    <div
      ref={spotlightRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[1] transition-opacity duration-500 opacity-0"
      style={{
        background:
          'radial-gradient(350px circle at var(--cursor-x, -500px) var(--cursor-y, -500px), rgba(34, 211, 238, 0.035), rgba(124, 92, 252, 0.018) 45%, transparent 70%)',
      }}
    />
  );
};
