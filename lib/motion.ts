"use client";

import { useReducedMotion } from "motion/react";

export function useMotionVariants() {
  const reduce = useReducedMotion();

  const riseIn = {
    hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const staggerChildren = (stagger = 0.07) => ({
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : stagger },
    },
  });

  const fadeIn = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.35 } },
  };

  const slideUp = {
    hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return { riseIn, staggerChildren, fadeIn, slideUp };
}
