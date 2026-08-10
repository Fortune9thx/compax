"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-hover",
        secondary: "bg-bg-elevated text-text-primary border border-border hover:border-text-muted",
        ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
        danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
      },
      size: {
        sm: "text-xs px-3 py-1.5 rounded-md",
        md: "text-sm px-4 py-2.5 rounded-lg",
        lg: "text-base px-6 py-3 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="deliberate-dot inline-block h-2 w-2 rounded-full bg-current" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
