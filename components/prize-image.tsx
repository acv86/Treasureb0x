import { cn } from "cn";

export function PrizeImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // Generated prize art is a data URI, and a later custom image may be one too.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={1000}
      height={1000}
      className={cn(
        "aspect-square w-full rounded-3xl bg-[#4a2a12] object-cover ring-1 ring-foreground/15",
        className,
      )}
    />
  );
}
