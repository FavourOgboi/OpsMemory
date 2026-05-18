/**
 * OpsMemory — Unified API Client
 *
 * Thin wrapper around fetch that:
 * - Reads VITE_API_BASE_URL (default http://localhost:8000)
 * - Attaches Authorization header with Clerk token (or dev-mode bypass)
 * - Handles 401/403 by redirecting to sign-in
 * - Standardizes error handling
 */

import { createDevJwt } from "@/lib/dev-auth";

/** Prefer same-origin proxy in dev; fall back to explicit host for remote access. */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "" : "http://localhost:8000");

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // Dev mode bypass: if Clerk is disabled, use a demo token from localStorage
  let demoToken = localStorage.getItem("opsmemory-demo-token");
  if (!demoToken && import.meta.env.DEV) {
    demoToken = createDevJwt("ceo");
    localStorage.setItem("opsmemory-demo-token", demoToken);
    localStorage.setItem("opsmemory-demo-role", "ceo");
  }
  if (demoToken) return demoToken;
  return null;
}

function setDemoToken(role: string) {
  localStorage.setItem("opsmemory-demo-token", `demo-${role}`);
}

async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Dev mode role override header
  if (import.meta.env.DEV) {
    const demoRole = localStorage.getItem("opsmemory-demo-role") || "ceo";
    headers["X-Demo-Role"] = demoRole;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    if (import.meta.env.DEV && typeof window !== "undefined") {
      const retryToken = createDevJwt("ceo");
      localStorage.setItem("opsmemory-demo-token", retryToken);
      localStorage.setItem("opsmemory-demo-role", "ceo");
    } else if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
    throw new Error(`Authentication error: ${response.status}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export const api = {
  get: (path: string) => apiFetch(path, { method: "GET" }),
  post: (path: string, body?: any) =>
    apiFetch(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: (path: string, body?: any) =>
    apiFetch(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (path: string) => apiFetch(path, { method: "DELETE" }),
};

export { API_BASE, setDemoToken };
