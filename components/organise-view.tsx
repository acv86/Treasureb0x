"use client";

import Link from "next/link";
import { useT } from "@/components/providers";

export function OrganiseView() {
  const tr = useT();
  return (
    <div className="space-y-4">
      <Link href="/hunts" className="text-sm text-primary">{tr("back")}</Link>
      <h1 className="font-heading text-4xl text-balance">{tr("organiseTitle")}</h1>
      <p>{tr("organiseBody")}</p>
      <p className="text-sm text-muted-foreground">{tr("playersNeverPay")}</p>
    </div>
  );
}
