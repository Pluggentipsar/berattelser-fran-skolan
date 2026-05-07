"use client";
import { useState } from "react";

/** <img> that disappears (returns null) if the source 404s.
 *  Useful for placeholder images that may or may not exist on disk. */
export function OptionalImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
