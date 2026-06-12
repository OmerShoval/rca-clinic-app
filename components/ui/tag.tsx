import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  variant: "coral" | "teal" | "gold";
  className?: string;
}

const variantStyles = {
  coral: "text-coral bg-[--coral-soft]",
  teal:  "text-teal  bg-[--teal-soft]",
  gold:  "text-gold  bg-[--gold-soft]",
};

export function Tag({ children, variant, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-block font-display text-[12.5px] px-2.5 py-1 rounded-md",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
