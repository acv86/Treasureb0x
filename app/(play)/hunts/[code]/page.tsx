import { HuntDetail } from "@/components/hunt-detail";

export const instant = false;

export default async function HuntPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HuntDetail code={code} />;
}
