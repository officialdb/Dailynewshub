/** Typed API client for the Daily News Hub backend. */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearTokens();
      localStorage.removeItem("admin_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error?.detail ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ success: boolean; data: { user: import("./types").User; tokens: import("./types").TokenResponse } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false
    ),

  logout: () =>
    apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" }),
};

// ─── Admin: Users ─────────────────────────────────────────────────────────────

export const usersApi = {
  list: (page = 1, limit = 10) =>
    apiFetch<{ success: boolean; data: import("./types").PaginatedResponse<import("./types").User> }>(
      `/admin/users?page=${page}&limit=${limit}`
    ),

  update: (id: string, payload: import("./types").UserUpdate) =>
    apiFetch<{ success: boolean; data: import("./types").User }>(
      `/admin/users/${id}`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(
      `/admin/users/${id}`,
      { method: "DELETE" }
    ),
};

// ─── Admin: Articles ──────────────────────────────────────────────────────────

export const articlesApi = {
  list: (page = 1, limit = 10) =>
    apiFetch<{ success: boolean; data: import("./types").PaginatedResponse<import("./types").Article> }>(
      `/admin/articles?page=${page}&limit=${limit}`
    ),

  get: (id: string) =>
    apiFetch<{ success: boolean; data: import("./types").Article }>(
      `/articles/${id}`,
      {},
      false
    ),

  create: (payload: import("./types").ArticleCreate) =>
    apiFetch<{ success: boolean; data: import("./types").Article }>(
      "/admin/articles",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  update: (id: string, payload: import("./types").ArticleUpdate) =>
    apiFetch<{ success: boolean; data: import("./types").Article }>(
      `/admin/articles/${id}`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(
      `/admin/articles/${id}`,
      { method: "DELETE" }
    ),

  pin: (id: string) =>
    apiFetch<{ success: boolean; data: import("./types").Article }>(
      `/admin/articles/${id}/pin`,
      { method: "PUT" }
    ),
};

// ─── Admin: Analytics ────────────────────────────────────────────────────────

export const analyticsApi = {
  get: () =>
    apiFetch<{ success: boolean; data: import("./types").Analytics }>(
      "/admin/analytics"
    ),
};

// ─── Admin: Notifications ───────────────────────────────────────────────────

export const notificationsApi = {
  send: (payload: import("./types").SendNotificationRequest) =>
    apiFetch<{ success: boolean; data: import("./types").NotificationResponse }>(
      "/admin/notifications/send",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  schedule: (payload: import("./types").ScheduleNotificationRequest) =>
    apiFetch<{ success: boolean; data: import("./types").NotificationResponse }>(
      "/admin/notifications/schedule",
      { method: "POST", body: JSON.stringify(payload) }
    ),
};

// ─── Categories ─────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: async (): Promise<{ success: boolean; data: { id: string; name: string; slug: string }[] }> => {
    // Try public endpoint first; fall back to authenticated admin fetch on error
    try {
      return await apiFetch<{ success: boolean; data: { id: string; name: string; slug: string }[] }>(
        "/categories",
        {},
        false
      );
    } catch {
      // If public endpoint fails (e.g. CORS/Redis issue), try with auth token
      return apiFetch<{ success: boolean; data: { id: string; name: string; slug: string }[] }>(
        "/categories",
        {},
        true
      );
    }
  },
};


// ─── Admin: Reels ────────────────────────────────────────────────────────────

export const reelsApi = {
  list: (page = 1, limit = 10) =>
    apiFetch<{ success: boolean; data: import("./types").PaginatedResponse<import("./types").Reel> }>(
      `/admin/reels?page=${page}&limit=${limit}`
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(
      `/admin/reels/${id}`,
      { method: "DELETE" }
    ),
};

