/// <reference types="vite/client" />

/** Resolve first-party URLs for both the Sites root and GitHub Pages subdirectories. */
export function sitePath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return import.meta.env.BASE_URL.replace(/\/$/, "") + path;
}
