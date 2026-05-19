/**
 * OpsMemory — Unified API Client
 *
 * Thin wrapper around fetch that:
 * - Reads VITE_API_BASE_URL (default: same-origin proxy in dev, explicit URL in prod)
 * - Attaches Authorization header with JWT token from local auth
 * - Handles 401/403 by redirecting to sign-in
 * - Standardizes error handling
 */

/** Prefer same-origin proxy in dev; fall back to explicit host for prod. */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "" : "http://localhost:8000");

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Real auth token (from local auth system)
  const authToken = localStorage.getItem("opsmemory-token");
  if (authToken) return authToken;

  // 2. Demo mode token (for judges / team demo access)
  const demoMode = localStorage.getItem("opsmemory-demo-mode") === "true";
  if (demoMode) {
    const demoToken = localStorage.getItem("opsmemory-demo-token");
    if (demoToken) return demoToken;
    // Generate a simple demo token
    return "demo-ceo-token";
  }

  return null;
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

  // Demo mode header for backend to recognize
  if (typeof window !== "undefined" && localStorage.getItem("opsmemory-demo-mode") === "true") {
    headers["X-Demo-Role"] = "ceo";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Don't redirect in demo mode
    const isDemoMode = typeof window !== "undefined" && localStorage.getItem("opsmemory-demo-mode") === "true";
    if (!isDemoMode && typeof window !== "undefined") {
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

export { API_BASE };
