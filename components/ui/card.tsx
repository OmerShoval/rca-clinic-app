"use client";

import {
  type MotionStyle,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import * as React from "react";

import { registryTheme } from "@/lib/registry-theme";
import { cn } from "@/lib/utils";

interface ReducedMotionProp {
  reducedMotion?: boolean;
}

const ReducedMotionOverrideContext = React.createContext(false);

function useResolvedReducedMotion(reducedMotion?: boolean) {
  const override = React.useContext(ReducedMotionOverrideContext);
  const prefers = useReducedMotion() ?? false;
  return Boolean(reducedMotion || override || prefers);
}

function ReducedMotionConfig({
  children,
  reducedMotion,
}: ReducedMotionProp & { children: React.ReactNode }) {
  const resolved = useResolvedReducedMotion(reducedMotion);
  return (
    <MotionConfig reducedMotion={resolved ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}

const MotionDiv = motion.div;

const cardHoverSpring = {
  type: "spring" as const,
  stiffness: 95,
  damping: 19,
  mass: 0.92,
  restDelta: 0.001,
};

const cardLayoutTransition = {
  type: "spring" as const,
  stiffness: 220,
  damping: 30,
  mass: 0.85,
};

const CARD_SHADOW_HOVER =
  "0 20px 42px -30px rgba(0,200,200,0.15), 0 0 0 1px rgba(0,200,200,0.08)";

type MotionSafeDivProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onAnimationStart"
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
>;

type CardProps = MotionSafeDivProps &
  ReducedMotionProp & {
    interactive?: boolean;
    onHoverEnd?: () => void;
    onHoverStart?: () => void;
  };

type CardSectionProps = MotionSafeDivProps;

const cardSectionMotionProps = {
  layout: "position" as const,
  transition: cardLayoutTransition,
};

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref) ref.current = value;
}

function useCardHoverMotion(enabled: boolean) {
  const hoverTarget = useMotionValue(0);
  const hover = useSpring(hoverTarget, cardHoverSpring);

  const y = useTransform(hover, [0, 1], [0, -5]);
  const scale = useTransform(hover, [0, 1], [1, 1.006]);
  const shadowOpacity = useTransform(hover, [0, 1], [0, 1]);

  const setHover = React.useCallback(
    (active: boolean) => {
      if (!enabled) return;
      hoverTarget.set(active ? 1 : 0);
    },
    [enabled, hoverTarget]
  );

  React.useEffect(() => {
    if (!enabled) hoverTarget.set(0);
  }, [enabled, hoverTarget]);

  const hoverStyle: MotionStyle = { y, scale };
  return { hoverStyle, shadowOpacity, setHover };
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      interactive = false,
      reducedMotion,
      style: styleProp,
      onBlurCapture,
      onFocusCapture,
      onHoverEnd,
      onHoverStart,
      onPointerEnter,
      onPointerLeave,
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useResolvedReducedMotion(reducedMotion);
    const motionEnabled = interactive && !prefersReducedMotion;
    const focusWithinRef = React.useRef(false);
    const pointerInsideRef = React.useRef(false);
    const { hoverStyle, shadowOpacity, setHover } =
      useCardHoverMotion(motionEnabled);

    const activateHover = React.useCallback(() => setHover(true), [setHover]);
    const deactivateHover = React.useCallback(() => {
      if (!(focusWithinRef.current || pointerInsideRef.current)) setHover(false);
    }, [setHover]);

    const handleHoverStart = React.useCallback(() => {
      onHoverStart?.();
      activateHover();
    }, [activateHover, onHoverStart]);

    const handleHoverEnd = React.useCallback(() => {
      onHoverEnd?.();
      deactivateHover();
    }, [deactivateHover, onHoverEnd]);

    const handlePointerEnter = React.useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        onPointerEnter?.(e);
        if (e.defaultPrevented) return;
        pointerInsideRef.current = true;
        activateHover();
      },
      [activateHover, onPointerEnter]
    );

    const handlePointerLeave = React.useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(e);
        if (e.defaultPrevented) return;
        pointerInsideRef.current = false;
        deactivateHover();
      },
      [deactivateHover, onPointerLeave]
    );

    const handleFocusCapture = React.useCallback(
      (e: React.FocusEvent<HTMLDivElement>) => {
        onFocusCapture?.(e);
        if (e.defaultPrevented) return;
        focusWithinRef.current = true;
        activateHover();
      },
      [activateHover, onFocusCapture]
    );

    const handleBlurCapture = React.useCallback(
      (e: React.FocusEvent<HTMLDivElement>) => {
        onBlurCapture?.(e);
        if (e.defaultPrevented) return;
        const next = e.relatedTarget;
        if (next instanceof Node && e.currentTarget.contains(next)) return;
        focusWithinRef.current = false;
        deactivateHover();
      },
      [deactivateHover, onBlurCapture]
    );

    return (
      <ReducedMotionConfig reducedMotion={reducedMotion}>
        <MotionDiv
          {...props}
          className={cn(
            registryTheme,
            "relative flex transform-gpu flex-col gap-4 overflow-hidden rounded-[1.25rem] border border-border/70 bg-card/95 py-4 text-card-foreground text-sm backdrop-blur-[2px]",
            "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-1 before:h-px before:bg-linear-to-r before:from-transparent before:via-foreground/12 before:to-transparent before:opacity-60",
            "has-[>img:first-child]:pt-0 has-data-[slot=card-footer]:pb-0",
            "[&>img:first-child]:rounded-t-[inherit] [&>img:last-child]:rounded-b-[inherit]",
            motionEnabled && [
              "shadow-[0_1px_0_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,200,200,0.04)]",
              "transition-[background-color,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "before:transition-opacity before:duration-500 hover:border-primary/20 hover:bg-card hover:before:opacity-100",
              "focus-within:border-primary/20 focus-within:bg-card focus-within:before:opacity-100",
            ],
            interactive &&
              prefersReducedMotion && [
                "transition-[transform,border-color,background-color,box-shadow] duration-300",
                "hover:-translate-y-0.5 hover:border-primary/20 hover:bg-card",
                "focus-within:-translate-y-0.5 focus-within:border-primary/20 focus-within:bg-card",
              ],
            !interactive && [
              "transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            ],
            className
          )}
          data-interactive={interactive ? "true" : undefined}
          data-slot="card"
          initial={false}
          layout
          onBlurCapture={motionEnabled ? handleBlurCapture : onBlurCapture}
          onFocusCapture={motionEnabled ? handleFocusCapture : onFocusCapture}
          onHoverEnd={motionEnabled ? handleHoverEnd : onHoverEnd}
          onHoverStart={motionEnabled ? handleHoverStart : onHoverStart}
          onPointerEnter={motionEnabled ? handlePointerEnter : onPointerEnter}
          onPointerLeave={motionEnabled ? handlePointerLeave : onPointerLeave}
          ref={(node) => assignRef(ref, node)}
          style={motionEnabled ? { ...styleProp, ...hoverStyle } : styleProp}
          transition={cardLayoutTransition}
        >
          {motionEnabled ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
              style={{ boxShadow: CARD_SHADOW_HOVER, opacity: shadowOpacity }}
            />
          ) : null}
          {children}
        </MotionDiv>
      </ReducedMotionConfig>
    );
  }
);
Card.displayName = "Card";

function CardHeader({ className, ...props }: CardSectionProps) {
  return (
    <MotionDiv
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      data-slot="card-header"
      {...cardSectionMotionProps}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: CardSectionProps) {
  return (
    <MotionDiv
      className={cn("font-semibold text-base leading-snug tracking-[-0.01em]", className)}
      data-slot="card-title"
      {...cardSectionMotionProps}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: CardSectionProps) {
  return (
    <MotionDiv
      className={cn("text-muted-foreground text-sm leading-6", className)}
      data-slot="card-description"
      {...cardSectionMotionProps}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: CardSectionProps) {
  return (
    <MotionDiv
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      data-slot="card-action"
      {...cardSectionMotionProps}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: CardSectionProps) {
  return (
    <MotionDiv
      className={cn("px-4", className)}
      data-slot="card-content"
      {...cardSectionMotionProps}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: CardSectionProps) {
  return (
    <MotionDiv
      className={cn(
        "flex items-center rounded-b-[inherit] border-border/60 border-t bg-muted/45 p-4 text-muted-foreground backdrop-blur-[1px] transition-colors duration-300",
        className
      )}
      data-slot="card-footer"
      {...cardSectionMotionProps}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
