"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp, useT } from "@/components/providers";
import { Logo } from "@/components/logo";
import { Wizard } from "@/components/wizard";

export function Shell({ children }: { children: React.ReactNode }) {
  const { booted, session } = useApp();
  const tr = useT();
  const router = useRouter();
  const path = usePathname();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (booted && !session) router.replace("/");
  }, [booted, session, router]);

  if (!booted || !session) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Logo />
      </div>
    );
  }

  const item = (href: string, label: string) => {
    const on = path === href || path.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        aria-current={on ? "page" : undefined}
        className="flex h-12 items-center justify-center rounded-full text-sm aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background md:my-4 md:min-h-[calc(100dvh-2rem)] md:overflow-hidden md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-foreground/10">
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">{children}</div>
      <nav className="grid grid-cols-4 gap-1 border-t bg-background/95 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        {item("/hunts", tr("hunts"))}
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-12 items-center justify-center rounded-full text-sm aria-expanded:bg-primary aria-expanded:text-primary-foreground"
          aria-expanded={creating}
        >
          {tr("create")}
        </button>
        {item("/prizes", tr("prizes"))}
        {item("/you", tr("you"))}
      </nav>
      <Wizard open={creating} onOpenChange={setCreating} />
    </div>
  );
}
