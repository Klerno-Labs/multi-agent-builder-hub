import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const styles: Record<Variant, string> = {
    primary:
      "bg-cyan-500 text-slate-950 hover:bg-cyan-400 focus-visible:outline-cyan-500 disabled:opacity-70",
    secondary:
      "bg-slate-800 text-slate-50 hover:bg-slate-700 focus-visible:outline-slate-500 disabled:opacity-70",
    ghost:
      "bg-transparent text-slate-200 hover:bg-slate-800/60 focus-visible:outline-slate-500 disabled:opacity-70",
  };

  return (
    <button
      className={cn(base, styles[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
      )}
      {children}
    </button>
  );
}
