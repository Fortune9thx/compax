"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({
  value,
  onValueChange,
  min = 1,
  max = 10,
  className,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center h-5", className)}
      value={[value]}
      onValueChange={(v) => onValueChange(v[0])}
      min={min}
      max={max}
      step={1}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-bg-elevated border border-border">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full bg-white border-2 border-accent shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
    </SliderPrimitive.Root>
  );
}
