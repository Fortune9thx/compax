import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, elevated, ...props }: HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        elevated ? "compax-card-elevated" : "compax-card",
        "p-5",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between mb-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-medium text-text-primary", className)} {...props} />;
}

export function CardLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("compax-mono text-[10px] uppercase tracking-wider text-text-muted", className)}
      {...props}
    />
  );
}
