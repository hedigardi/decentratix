"use client";

import Image from "next/image";

interface ThemedLogoProps {
  className?: string;
}

export function ThemedLogo({ className }: ThemedLogoProps) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="brand-logo-button"
      aria-label="Reload page"
      title="Reload page"
    >
      <span className="themed-logo-stack" aria-hidden="true">
        <Image
          src="/logo_light-theme.png"
          alt="Decentratix logo"
          width={180}
          height={40}
          priority
          className={`${className ?? ""} themed-logo themed-logo-light`}
        />
        <Image
          src="/logo_dark-theme.png"
          alt=""
          width={180}
          height={40}
          priority
          className={`${className ?? ""} themed-logo themed-logo-dark`}
        />
      </span>
    </button>
  );
}
