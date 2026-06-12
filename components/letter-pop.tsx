"use client";

import { motion, useReducedMotion } from "motion/react";

interface LetterPopProps {
  name: string;
}

export function LetterPop({ name }: LetterPopProps) {
  const reduce = useReducedMotion();
  const firstName = name.split(" ")[0].toUpperCase();
  const stagger = Math.min(70, 400 / firstName.length) / 1000;

  if (reduce) {
    return (
      <h1 className="font-display text-ink text-[clamp(52px,14vw,80px)] leading-none">
        {firstName}
      </h1>
    );
  }

  return (
    <motion.h1
      className="font-display text-ink text-[clamp(52px,14vw,80px)] leading-none flex"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {firstName.split("").map((char, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
            },
          }}
          style={{ display: "inline-block" }}
        >
          {char}
        </motion.span>
      ))}
    </motion.h1>
  );
}
