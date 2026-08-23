"use client";

import Image from "next/image";
import { useBrand } from "@/components/BrandProvider";

export function BrandMark({ size = 40 }: { size?: number }) {
  const { brand } = useBrand();

  if (brand.logoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logoDataUrl}
        alt={brand.name}
        style={{ width: size, height: size }}
        className="rounded-[0.9rem] object-cover"
      />
    );
  }

  return (
    <Image
      src="/safersay-mark.svg"
      alt={brand.name}
      width={size}
      height={size}
      priority
      className="rounded-[0.9rem]"
    />
  );
}
