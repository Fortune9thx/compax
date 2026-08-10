import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-lg border border-border bg-bg-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-colors focus-visible:border-border-focus focus-visible:outline-none disabled:opacity-40";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { charCount?: number; maxChars?: number }>(
  ({ className, charCount, maxChars, ...props }, ref) => (
    <div className="relative">
      <textarea ref={ref} className={cn(fieldBase, "resize-y min-h-[96px]", className)} {...props} />
      {typeof maxChars === "number" && (
        <span
          className={cn(
            "compax-mono absolute bottom-2 right-3 text-[10px]",
            (charCount ?? 0) > maxChars ? "text-danger" : "text-text-muted"
          )}
        >
          {charCount ?? 0}/{maxChars}
        </span>
      )}
    </div>
  )
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("compax-mono block text-[11px] uppercase tracking-wider text-text-muted mb-2", className)}
      {...props}
    />
  );
}

export function FieldHint({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-xs text-text-muted mt-1.5", className)}>{children}</p>;
}
