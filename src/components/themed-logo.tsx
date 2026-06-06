"use client";

import Image from "next/image";

interface ThemedLogoProps {
  className?: string;
}

export function ThemedLogo({ className }: ThemedLogoProps) {
  return (
    <>
      <Image
        src="/logo_light-theme.png"
        alt="Decentratix logo"
        width={180}
        height={40}
        className={`${className ?? ""} themed-logo-light`}
      />
      <Image
        src="/logo_dark-theme.png"
        alt="Decentratix logo"
        width={180}
        height={40}
        className={`${className ?? ""} themed-logo-dark`}
      />
    </>
  );
}
