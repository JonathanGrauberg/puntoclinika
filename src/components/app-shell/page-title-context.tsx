"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

interface PageTitleContextValue {
  title: string;
  setTitle: (title: string) => void;
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState("");
  return <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>;
}

function usePageTitleContext() {
  const ctx = useContext(PageTitleContext);
  if (!ctx) throw new Error("usePageTitleContext debe usarse dentro de <PageTitleProvider>");
  return ctx;
}

export function usePageTitle() {
  return usePageTitleContext().title;
}

/**
 * Cada page la renderiza para anunciar su título al Topbar, que vive en el
 * layout y no se remonta entre navegaciones (por eso el título no puede ser
 * simplemente una prop de Shell).
 */
export function PageTitle({ title }: { title: string }) {
  const { setTitle } = usePageTitleContext();
  useLayoutEffect(() => {
    setTitle(title);
  }, [title, setTitle]);
  return null;
}
