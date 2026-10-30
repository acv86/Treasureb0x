import { cn } from "cn";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("size-9", className)}>
      <rect x="4" y="4" width="40" height="40" rx="12" className="fill-primary" />
      <rect x="13" y="13" width="22" height="22" rx="6" className="fill-primary-foreground" />
      <circle cx="24" cy="24" r="4" className="fill-primary" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Mark />
      <span className="font-heading text-[1.65rem] leading-none tracking-tight">Treasureb0x</span>
    </div>
  );
}
