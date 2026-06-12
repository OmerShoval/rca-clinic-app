"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useMotionVariants } from "@/lib/motion";

interface CardGlassProps {
  children: React.ReactNode;
  spine?: "coral" | "teal" | "gold";
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

export function CardGlass({
  children,
  spine,
  className,
  onClick,
  animate = true,
}: CardGlassProps) {
  const { riseIn } = useMotionVariants();

  const spineClass = spine
    ? { coral: "spine-coral", teal: "spine-teal", gold: "spine-gold" }[spine]
    : undefined;

  return (
    <motion.div
      variants={animate ? riseIn : undefined}
      initial={animate ? "hidden" : undefined}
      animate={animate ? "show" : undefined}
      onClick={onClick}
      className={cn(
        "glass-card p-4",
        spineClass,
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
