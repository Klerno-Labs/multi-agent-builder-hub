import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg backdrop-blur", className)}>
      {children}
    </div>
  );
}
