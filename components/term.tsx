"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function Term({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="cursor-help underline decoration-dotted decoration-primary/70 underline-offset-4"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm leading-relaxed">{tip}</PopoverContent>
    </Popover>
  );
}
