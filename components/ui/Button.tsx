import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "warning" | "claim";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-1.5 rounded-xl transition-all select-none cursor-pointer active:translate-y-0.5 active:shadow-none whitespace-nowrap";

  const sizeStyles = {
    sm: "h-8 px-2.5 text-[11px]",
    md: "h-9 px-3 text-xs",
    lg: "h-12 px-4 text-sm font-black",
    icon: "w-9 h-9 p-0",
  }[size];

  const variantStyles = {
    primary:
      "font-black text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 border-t border-emerald-300/60 border-x border-b border-emerald-900 shadow-[0_3px_10px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.35),0_2px_0_rgba(6,78,59,1)] hover:brightness-110",
    secondary:
      "font-semibold text-emerald-400 bg-gradient-to-b from-zinc-800 to-zinc-900 border-t border-zinc-700/70 border-x border-b border-zinc-950 shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08),0_2px_0_rgba(15,15,15,1)] hover:text-emerald-300 hover:border-emerald-500/30",
    claim:
      "font-bold text-emerald-400 bg-gradient-to-b from-emerald-950/70 to-zinc-900 border-t border-emerald-400/40 border-x border-b border-emerald-950 shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(16,185,129,0.2)] hover:border-emerald-400/60",
    warning:
      "font-bold text-amber-400 bg-gradient-to-b from-zinc-800 to-zinc-900 border-t border-amber-500/30 border-x border-b border-zinc-950 shadow-[0_2px_6px_rgba(0,0,0,0.6),0_2px_0_rgba(15,15,15,1)] hover:text-amber-300",
    danger:
      "font-bold text-rose-500 bg-gradient-to-b from-zinc-800 to-zinc-900 border-t border-rose-500/30 border-x border-b border-zinc-950 shadow-[0_2px_6px_rgba(0,0,0,0.6),0_2px_0_rgba(15,15,15,1)] hover:text-rose-400",
  }[variant];

  return (
    <button className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;

