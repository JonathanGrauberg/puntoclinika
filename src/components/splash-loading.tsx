"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

/**
 * Pantalla de carga con el isotipo de .clinika en vez de skeletons.
 * Se usa en app/loading.tsx (boundary de navegación de Next) y en
 * cualquier punto donde antes hubiera ido un esqueleto de contenido.
 */
export function SplashLoading() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logoSrc =
    mounted && resolvedTheme === "dark" ? "/brand/logo-dark.png" : "/brand/logo-light.png";

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background">
      <Image
        src={logoSrc}
        alt=".clinika"
        width={200}
        height={56}
        priority
        className="h-auto w-40 sm:w-48"
      />
      <div className="flex items-center gap-2" role="status" aria-label="Cargando">
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-primary [animation-delay:0ms]" />
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-primary [animation-delay:160ms]" />
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-primary [animation-delay:320ms]" />
      </div>
    </div>
  );
}
