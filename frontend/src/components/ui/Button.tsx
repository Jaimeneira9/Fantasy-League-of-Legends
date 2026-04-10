import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "feedback-success"
  | "feedback-error"
  | "locked"
  | "destructive-text";

export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#FCD400] text-black font-bold hover:brightness-90 active:scale-95 disabled:opacity-40",
  secondary:
    "bg-transparent border border-white/10 text-white/60 hover:text-white hover:border-white/30 active:scale-95 disabled:opacity-40",
  ghost:
    "bg-transparent border border-[#FCD400]/40 text-[#FCD400] hover:border-[#FCD400] active:scale-95 disabled:opacity-40",
  destructive:
    "bg-transparent border border-red-500/30 text-red-400 hover:border-red-400 active:scale-95 disabled:opacity-40",
  "feedback-success":
    "bg-green-900/50 border border-green-500/30 text-green-400",
  "feedback-error":
    "bg-transparent border border-red-500/30 text-red-400",
  locked:
    "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed",
  "destructive-text":
    "bg-transparent text-red-400 hover:text-red-300 active:scale-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none";

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        BASE,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
      {!isLoading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}
