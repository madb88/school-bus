import Image from "next/image";
import { cn } from "cn";

type WeekendBusIllustrationProps = {
  className?: string;
};

/** Sleeping school bus illustration for the weekend placeholder. */
export function WeekendBusIllustration({
  className,
}: WeekendBusIllustrationProps) {
  return (
    <Image
      src="/images/weekend-bus.webp"
      alt=""
      width={800}
      height={474}
      priority
      unoptimized
      className={cn(
        "mx-auto h-auto w-full max-w-52 select-none sm:max-w-72",
        className,
      )}
    />
  );
}
