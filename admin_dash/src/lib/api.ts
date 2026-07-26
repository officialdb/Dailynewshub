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
    if (res.status === 401 && authenticated) {
      clearTokens();
      localStorage.removeItem("admin_user");
      window.dispatchEvent(new Event("auth:token-expired"));
      throw new Error("Session expired — please log in again");
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
  list: (page = 1, limit = 10, search = "") =>
    apiFetch<{ success: boolean; data: import("./types").PaginatedResponse<import("./types").User> }>(
      `/admin/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    ),

  create: (payload: import("./types").UserCreate) =>
    apiFetch<{ success: boolean; data: import("./types").User }>(
      "/admin/users",
      { method: "POST", body: JSON.stringify(payload) }
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
  list: (page = 1, limit = 10, params: { search?: string; category_id?: string } = {}) =>
    apiFetch<{ success: boolean; data: import("./types").PaginatedResponse<import("./types").Article> }>(
      `/admin/articles?page=${page}&limit=${limit}${params.search ? `&search=${encodeURIComponent(params.search)}` : ""}${params.category_id ? `&category_id=${params.category_id}` : ""}`
    ),

  get: (id: string) =>
    apiFetch<{ success: boolean; data: import("./types").Article }>(
      `/admin/articles/${id}`
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

  togglePin: (id: string) =>
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

  activity: () =>
    apiFetch<{ success: boolean; data: import("./types").RecentActivity }>(
      "/admin/activity"
    ),
};

// ─── Admin: Categories ───────────────────────────────────────────────────────

export const categoriesApi = {
  list: () =>
    apiFetch<{ success: boolean; data: import("./types").Category[] }>(
      "/admin/categories"
    ),

  create: (payload: import("./types").CategoryCreate) =>
    apiFetch<{ success: boolean; data: import("./types").Category }>(
      "/categories",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  update: (id: string, payload: import("./types").CategoryUpdate) =>
    apiFetch<{ success: boolean; data: import("./types").Category }>(
      `/categories/${id}`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(
      `/categories/${id}`,
      { method: "DELETE" }
    ),
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

// ─── Admin: Notifications ────────────────────────────────────────────────────

export const notificationsApi = {
  list: (page = 1, limit = 10) =>
    apiFetch<{ success: boolean; data: import("./types").PaginatedResponse<import("./types").Notification> }>(
      `/admin/notifications?page=${page}&limit=${limit}`
    ),

  send: (payload: import("./types").NotificationSend) =>
    apiFetch<{ success: boolean; data: { notification_id: string; sent_count: number } }>(
      "/admin/notifications/send",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  schedule: (payload: import("./types").NotificationSchedule) =>
    apiFetch<{ success: boolean; data: { notification_id: string; scheduled_at: string } }>(
      "/admin/notifications/schedule",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(
      `/admin/notifications/${id}`,
      { method: "DELETE" }
    ),
};

// ─── Admin: Comments ─────────────────────────────────────────────────────────

export const commentsApi = {
  list: (page = 1, limit = 10) =>
    apiFetch<{ success: boolean; data: import("./types").PaginatedResponse<import("./types").Comment> }>(
      `/admin/comments?page=${page}&limit=${limit}`
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(
      `/admin/comments/${id}`,
      { method: "DELETE" }
    ),
};
