import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  color?: "green" | "yellow" | "red" | "blue" | "gray" | "orange";
  className?: string;
}

const colorMap: Record<NonNullable<BadgeProps["color"]>, string> = {
  green: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  yellow: "bg-amber-500/20 text-amber-100 border-amber-400/40",
  red: "bg-rose-500/20 text-rose-100 border-rose-500/40",
  blue: "bg-cyan-500/20 text-cyan-100 border-cyan-500/40",
  orange: "bg-orange-500/20 text-orange-100 border-orange-400/40",
  gray: "bg-slate-700/50 text-slate-200 border-slate-600",
};

export function Badge({ children, color = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
        colorMap[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
