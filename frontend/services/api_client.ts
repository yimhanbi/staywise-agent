/**
 * Service layer — API client and external integrations.
 */

const DEFAULT_BASE_URL = "/api";

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (typeof window === "undefined") {
    return configured ?? DEFAULT_BASE_URL;
  }

  // In browser local development, prefer same-origin proxy to avoid CORS/network mismatches.
  if (
    configured &&
    !configured.startsWith("/") &&
    /(localhost|127\.0\.0\.1)/.test(configured)
  ) {
    return DEFAULT_BASE_URL;
  }

  return configured ?? DEFAULT_BASE_URL;
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
