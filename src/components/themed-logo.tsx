"use client";

import Image from "next/image";

import { useTheme } from "@/components/theme-provider";

interface ThemedLogoProps {
  className?: string;
}

export function ThemedLogo({ className }: ThemedLogoProps) {
  const { theme } = useTheme();

  const src =
    theme === "dark" ? "/logo_dark-theme.png" : "/logo_light-theme.png";

  return (
    <Image
      src={src}
      alt="Decentratix logo"
      width={180}
      height={40}
      priority
      className={className}
    />
  );
}
