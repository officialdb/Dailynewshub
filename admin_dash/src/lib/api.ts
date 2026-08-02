/** Typed API client for the Daily News Hub backend. */

import type {
  V2Article, V2ArticleCreate, V2ArticleUpdate, V2AuthData, V2User,
  V2Category, V2Tag, V2Transition, V2Revision, V2FactCheck,
  V2DashboardStats, V2PipelineStats, V2Assignment,
  V2AuditLog, V2EditorialNotification, V2MediaUpload,
  V2Role, V2Permission, V2HealthStatus, V2SystemSettings, V2ApiKey, V2ApiKeyCreated,
  PaginatedResponse, User, Article, Category, Reel, Notification, Comment,
  Analytics, RecentActivity, TokenResponse,
  UserCreate, UserUpdate, ArticleCreate, ArticleUpdate,
  CategoryCreate, CategoryUpdate, NotificationSend, NotificationSchedule,
  DeveloperRegisterRequest, DeveloperLoginRequest, DeveloperResponse, DeveloperTokenResponse,
  DeveloperProfileUpdateRequest, DeveloperAppResponse, CreateDeveloperAppRequest, UpdateDeveloperAppRequest,
  CreateDeveloperApiKeyRequest, DeveloperApiKeyResponse, DeveloperApiKeyCreatedResponse,
  UsageStatsResponse, UsageHistoryResponse, TopEndpointResponse,
  PublicArticleResponse, PublicReelResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api-proxy/v1";
const V2_BASE = BASE_URL.replace(/\/v1$/, "/v2");

// ─── Token helpers ────────────────────────────────────────────────────────────

// --- SEC FIX SEC-007 ---
export function getAccessToken(): string | null {
  return null;
}

// --- SEC FIX SEC-007 ---
export function setTokens(_access?: string, _refresh?: string) {
  // Tokens are stored by the backend in httpOnly cookies.
}

// --- SEC FIX SEC-007 ---
export function clearTokens() {
  // Server logout clears auth cookies.
}

// --- SEC FIX SEC-007 ---
export function getRefreshToken(): string | null {
  return null;
}

// --- SEC FIX SEC-007 ---
export function getDeveloperAccessToken(): string | null {
  return null;
}

// --- SEC FIX SEC-007 ---
export function setDeveloperTokens(_access?: string, _refresh?: string) {
  // Developer tokens are stored by the backend in httpOnly cookies.
}

// --- SEC FIX SEC-007 ---
export function clearDeveloperTokens() {
  // Server logout clears developer auth cookies.
}

// --- SEC FIX SEC-007 ---
export function getDeveloperRefreshToken(): string | null {
  return null;
}

// In-flight refresh promise to avoid concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function parseApiError(res: Response): Promise<string> {
  const payload = await res.json().catch(() => null);
  if (typeof payload === "string") return payload;
  if (payload?.error?.message) return payload.error.message;
  if (payload?.detail) return payload.detail;
  if (payload?.message) return payload.message;
  return res.statusText || "Request failed";
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // --- SEC FIX SEC-007 ---
      const res = await fetch(`${V2_BASE}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        console.warn("[auth] Refresh failed:", res.status, res.statusText);
        return null;
      }
      const json = await res.json();
      if (json?.data?.user) {
        console.log("[auth] Cookie session refreshed successfully");
        return "cookie-session";
      }
      console.warn("[auth] No user in refresh response");
      return null;
    } catch (err) {
      console.warn("[auth] Refresh request failed:", err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

let developerRefreshPromise: Promise<string | null> | null = null;

async function refreshDeveloperAccessToken(): Promise<string | null> {
  if (developerRefreshPromise) return developerRefreshPromise;

  developerRefreshPromise = (async () => {
    try {
      // --- SEC FIX SEC-007 ---
      const res = await fetch(`${V2_BASE}/developer/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const tokens = json?.data ?? json;
      if (tokens?.developer) {
        const developer = tokens.developer ?? json?.data?.developer;
        if (developer && typeof window !== "undefined") {
          localStorage.setItem("developer_user", JSON.stringify(developer));
        }
        return "developer-cookie-session";
      }
      return null;
    } catch {
      return null;
    } finally {
      developerRefreshPromise = null;
    }
  })();

  return developerRefreshPromise;
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

  // --- SEC FIX SEC-007 ---
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: "include" });

  if (!res.ok) {
    if (res.status === 401 && authenticated) {
      // v1 apiFetch doesn't clear tokens - v1 may not recognize v2 tokens
      // v2ApiFetch handles its own token clearing
      throw new Error("Session expired — please log in again");
    }
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ success: boolean; data: { user: User; tokens: TokenResponse } }>(
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
    apiFetch<{ success: boolean; data: PaginatedResponse<User> }>(
      `/admin/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    ),

  create: (payload: UserCreate) =>
    apiFetch<{ success: boolean; data: User }>(
      "/admin/users",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  update: (id: string, payload: UserUpdate) =>
    apiFetch<{ success: boolean; data: User }>(
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
    apiFetch<{ success: boolean; data: PaginatedResponse<Article> }>(
      `/admin/articles?page=${page}&limit=${limit}${params.search ? `&search=${encodeURIComponent(params.search)}` : ""}${params.category_id ? `&category_id=${params.category_id}` : ""}`
    ),

  listPublic: (page = 1, limit = 10) =>
    publicApiFetch<{ success: boolean; data: PaginatedResponse<Article> }>(
      `/public/articles?page=${page}&limit=${limit}`
    ),

  get: (id: string) =>
    apiFetch<{ success: boolean; data: Article }>(
      `/admin/articles/${id}`
    ),

  create: (payload: ArticleCreate) =>
    apiFetch<{ success: boolean; data: Article }>(
      "/admin/articles",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  update: (id: string, payload: ArticleUpdate) =>
    apiFetch<{ success: boolean; data: Article }>(
      `/admin/articles/${id}`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(
      `/admin/articles/${id}`,
      { method: "DELETE" }
    ),

  togglePin: (id: string) =>
    apiFetch<{ success: boolean; data: Article }>(
      `/admin/articles/${id}/pin`,
      { method: "PUT" }
    ),
};

// ─── Admin: Analytics ────────────────────────────────────────────────────────

export const analyticsApi = {
  get: () =>
    apiFetch<{ success: boolean; data: Analytics }>(
      "/admin/analytics"
    ),

  activity: () =>
    apiFetch<{ success: boolean; data: RecentActivity }>(
      "/admin/activity"
    ),
};

// ─── Admin: Categories ───────────────────────────────────────────────────────

export const categoriesApi = {
  list: () =>
    apiFetch<{ success: boolean; data: Category[] }>(
      "/admin/categories"
    ),

  create: (payload: CategoryCreate) =>
    apiFetch<{ success: boolean; data: Category }>(
      "/categories",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  update: (id: string, payload: CategoryUpdate) =>
    apiFetch<{ success: boolean; data: Category }>(
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
    apiFetch<{ success: boolean; data: PaginatedResponse<Reel> }>(
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
    v2ApiFetch<{ success: boolean; data: PaginatedResponse<Notification> }>(
      `/notifications/push?page=${page}&limit=${limit}`
    ),

  send: (payload: NotificationSend) =>
    v2ApiFetch<{ success: boolean; data: { notification_id: string; sent_count: number } }>(
      "/notifications/push/send",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  schedule: (payload: NotificationSchedule) =>
    v2ApiFetch<{ success: boolean; data: { notification_id: string; scheduled_at: string } }>(
      "/notifications/push/schedule",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  delete: (id: string) =>
    v2ApiFetch<{ success: boolean }>(
      `/notifications/push/${id}`,
      { method: "DELETE" }
    ),
};

// ─── Admin: Comments ─────────────────────────────────────────────────────────

export const commentsApi = {
  list: (page = 1, limit = 10) =>
    apiFetch<{ success: boolean; data: PaginatedResponse<Comment> }>(
      `/admin/comments?page=${page}&limit=${limit}`
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(
      `/admin/comments/${id}`,
      { method: "DELETE" }
    ),
};

// ─── Developer Platform ──────────────────────────────────────────────────────

export const developerAuthApi = {
  register: (payload: DeveloperRegisterRequest) =>
    publicApiFetch<{ success: boolean; message: string; data: DeveloperResponse }>(
      "/developer/auth/register",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  verifyEmail: (token: string) =>
    publicApiFetch<{ success: boolean; message: string; data: DeveloperResponse; redirect_url?: string }>(
      `/developer/auth/verify-email?token=${encodeURIComponent(token)}`,
    ),
  login: (payload: DeveloperLoginRequest) =>
    publicApiFetch<{ success: boolean; message: string; data: DeveloperTokenResponse }>(
      "/developer/auth/login",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  refresh: (refreshToken: string) =>
    publicApiFetch<{ success: boolean; message: string; data: DeveloperTokenResponse }>(
      "/developer/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
    ),
  logout: () =>
    developerApiFetch<{ success: boolean; message: string }>(
      "/developer/auth/logout",
      { method: "POST" },
    ),
  me: () =>
    developerApiFetch<{ success: boolean; message: string; data: DeveloperResponse }>(
      "/developer/me",
    ),
  updateMe: (payload: DeveloperProfileUpdateRequest) =>
    developerApiFetch<{ success: boolean; message: string; data: DeveloperResponse }>(
      "/developer/me",
      { method: "PUT", body: JSON.stringify(payload) },
    ),
};

export const developerAppsApi = {
  list: () =>
    developerApiFetch<{ success: boolean; message: string; data: DeveloperAppResponse[] }>(
      "/developer/apps",
    ),
  get: (id: string) =>
    developerApiFetch<{ success: boolean; message: string; data: DeveloperAppResponse }>(
      `/developer/apps/${id}`,
    ),
  create: (payload: CreateDeveloperAppRequest) =>
    developerApiFetch<{ success: boolean; message: string; data: DeveloperAppResponse }>(
      "/developer/apps",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  update: (id: string, payload: UpdateDeveloperAppRequest) =>
    developerApiFetch<{ success: boolean; message: string; data: DeveloperAppResponse }>(
      `/developer/apps/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),
  delete: (id: string) =>
    developerApiFetch<{ success: boolean; message: string }>(
      `/developer/apps/${id}`,
      { method: "DELETE" },
    ),
};

export const developerKeysApi = {
  list: () =>
    developerApiFetch<{ success: boolean; message: string; data: DeveloperApiKeyResponse[] }>(
      "/developer/keys",
    ),
  create: (appId: string, payload: CreateDeveloperApiKeyRequest) =>
    developerApiFetch<{ success: boolean; message: string; data: DeveloperApiKeyCreatedResponse }>(
      `/developer/keys/apps/${appId}/keys`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  revoke: (keyId: string) =>
    developerApiFetch<{ success: boolean; message: string; data: { id: string; message: string } }>(
      `/developer/keys/${keyId}`,
      { method: "DELETE" },
    ),
  usage: (keyId: string, periodDays = 30) =>
    developerApiFetch<{ success: boolean; message: string; data: UsageHistoryResponse }>(
      `/developer/keys/${keyId}/usage?period_days=${periodDays}`,
    ),
};

export const developerUsageApi = {
  stats: (apiKeyId?: string | null) =>
    developerApiFetch<{ success: boolean; message: string; data: UsageStatsResponse }>(
      `/developer/me/usage${apiKeyId ? `?api_key_id=${encodeURIComponent(apiKeyId)}` : ""}`,
    ),
  history: (periodDays = 30, apiKeyId?: string | null) =>
    developerApiFetch<{ success: boolean; message: string; data: UsageHistoryResponse }>(
      `/developer/me/usage/history?period_days=${periodDays}${apiKeyId ? `&api_key_id=${encodeURIComponent(apiKeyId)}` : ""}`,
    ),
  topEndpoints: (periodDays = 30) =>
    developerApiFetch<{ success: boolean; message: string; data: TopEndpointResponse[] }>(
      `/developer/me/usage/endpoints?period_days=${periodDays}`,
    ),
};

export const developerPublicApi = {
  articles: (params: { page?: number; limit?: number; category?: string; source?: string; language?: string; from_date?: string; to_date?: string } = {}, apiKey?: string | null) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.category) qs.set("category", params.category);
    if (params.source) qs.set("source", params.source);
    if (params.language) qs.set("language", params.language);
    if (params.from_date) qs.set("from_date", params.from_date);
    if (params.to_date) qs.set("to_date", params.to_date);
    return publicApiFetch<{ success: boolean; message: string; data: { items: PublicArticleResponse[]; total: number; page: number; limit: number; pages: number } }>(
      `/public/articles${qs.toString() ? `?${qs.toString()}` : ""}`,
      {},
      apiKey,
    );
  },
  article: (id: string, apiKey?: string | null) =>
    publicApiFetch<{ success: boolean; message: string; data: PublicArticleResponse }>(
      `/public/articles/${id}`,
      {},
      apiKey,
    ),
  searchArticles: (params: { q: string; page?: number; limit?: number; category?: string }, apiKey?: string | null) => {
    const qs = new URLSearchParams();
    qs.set("q", params.q);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.category) qs.set("category", params.category);
    return publicApiFetch<{ success: boolean; message: string; data: { items: PublicArticleResponse[]; total: number; page: number; limit: number; pages: number } }>(
      `/public/articles/search?${qs.toString()}`,
      {},
      apiKey,
    );
  },
  trendingArticles: (params: { limit?: number; category?: string } = {}, apiKey?: string | null) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.category) qs.set("category", params.category);
    return publicApiFetch<{ success: boolean; message: string; data: PublicArticleResponse[] }>(
      `/public/articles/trending${qs.toString() ? `?${qs.toString()}` : ""}`,
      {},
      apiKey,
    );
  },
  categories: (apiKey?: string | null) =>
    publicApiFetch<{ success: boolean; message: string; data: Category[] }>(
      "/public/categories",
      {},
      apiKey,
    ),
  reels: (params: { page?: number; limit?: number; category?: string; channel_id?: string } = {}, apiKey?: string | null) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.category) qs.set("category", params.category);
    if (params.channel_id) qs.set("channel_id", params.channel_id);
    return publicApiFetch<{ success: boolean; message: string; data: { items: PublicReelResponse[]; total: number; page: number; limit: number; pages: number } }>(
      `/developer/reels${qs.toString() ? `?${qs.toString()}` : ""}`,
      {},
      apiKey,
    );
  },
  recommendations: (params: { user_identifier: string; limit?: number; category?: string }, apiKey?: string | null) => {
    const qs = new URLSearchParams();
    qs.set("user_identifier", params.user_identifier);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.category) qs.set("category", params.category);
    return publicApiFetch<{ success: boolean; message: string; data: PublicArticleResponse[] }>(
      `/developer/recommendations?${qs.toString()}`,
      {},
      apiKey,
    );
  },
  registerUser: (body: { user_identifier: string; category_preferences: string[] }, apiKey?: string | null) =>
    publicApiFetch<{ success: boolean; message: string; data: { user_identifier: string; created_at: string } }>(
      "/developer/users",
      { method: "POST", body: JSON.stringify(body) },
      apiKey,
    ),
  recordUserEvent: (userIdentifier: string, body: { event_type: "view" | "complete" | "skip" | "bookmark"; article_id: string; watch_duration_seconds?: number | null; completion_rate?: number | null }, apiKey?: string | null) =>
    publicApiFetch<{ success: boolean; message: string }>(
      `/developer/users/${encodeURIComponent(userIdentifier)}/events`,
      { method: "POST", body: JSON.stringify(body) },
      apiKey,
    ),
};

// ─── V2 API: NMS Editorial System ──────────────────────────────────────────

async function v2Fetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path.replace(V2_BASE, ""), {
    ...options,
    headers: {
      ...options.headers,
    },
  });
}

// Helper to build v2 URLs using the same apiFetch with the v2 prefix
async function v2ApiFetch<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // --- SEC FIX SEC-007 ---
  console.log(`[v2ApiFetch] ${options.method || "GET"} ${V2_BASE}${path} | auth: cookie`);

  const res = await fetch(`${V2_BASE}${path}`, { ...options, headers, credentials: "include" });

  if (!res.ok) {
    console.log(`[v2ApiFetch] Response: ${res.status} ${res.statusText}`);
  }

  if (!res.ok) {
    const isSessionProbe = path === "/users/me";
    if (res.status === 401 && !retried && path !== "/auth/login" && !isSessionProbe) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return v2ApiFetch<T>(path, options, true);
      }
      clearTokens();
      localStorage.removeItem("developer_user");
      window.dispatchEvent(new Event("auth:token-expired"));
      throw new Error("Session expired — please log in again");
    }
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<T>;
}

async function developerApiFetch<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // --- SEC FIX SEC-007 ---
  const res = await fetch(`${V2_BASE}${path}`, { ...options, headers, credentials: "include" });

  if (!res.ok) {
    if (
      res.status === 401 &&
      !retried &&
      !path.startsWith("/developer/auth/login") &&
      !path.startsWith("/developer/auth/register") &&
      !path.startsWith("/developer/auth/refresh")
    ) {
      const newToken = await refreshDeveloperAccessToken();
      if (newToken) {
        return developerApiFetch<T>(path, options, true);
      }
      clearDeveloperTokens();
      localStorage.removeItem("developer_user");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("developer:token-expired"));
      }
      throw new Error("Session expired — please log in again");
    }
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<T>;
}

async function publicApiFetch<T>(path: string, options: RequestInit = {}, apiKey?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  // --- SEC FIX SEC-007 ---
  const res = await fetch(`${V2_BASE}${path}`, { ...options, headers, credentials: "include" });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<T>;
}

// ─── V2: Auth ──────────────────────────────────────────────────────────────

export const v2AuthApi = {
  login: (email: string, password: string) =>
    v2ApiFetch<{ success: boolean; data: V2AuthData }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),
  register: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    country?: string;
    state?: string;
    phone_number?: string;
  }) =>
    v2ApiFetch<{ success: boolean; data: V2AuthData }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  me: () =>
    v2ApiFetch<{ success: boolean; data: V2User }>("/users/me"),
  // --- SEC FIX SEC-007 ---
  logout: () =>
    v2ApiFetch<{ success: boolean; message: string }>("/auth/logout", { method: "POST" }),
};

// ─── V2: Articles (Editorial) ──────────────────────────────────────────────

export const v2ArticlesApi = {
  list: (params: { page?: number; limit?: number; status?: string; search?: string; category_id?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);
    if (params.category_id) qs.set("category_id", params.category_id);
    return v2ApiFetch<{ success: boolean; data: PaginatedResponse<V2Article> }>(
      `/articles?${qs.toString()}`,
    );
  },
  get: (id: string) =>
    v2ApiFetch<{ success: boolean; data: V2Article }>(`/articles/${id}`),
  create: (payload: V2ArticleCreate) =>
    v2ApiFetch<{ success: boolean; data: V2Article }>(
      "/articles",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  update: (id: string, payload: V2ArticleUpdate) =>
    v2ApiFetch<{ success: boolean; data: V2Article }>(
      `/articles/${id}`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),
  delete: (id: string) =>
    v2ApiFetch<{ success: boolean }>(`/articles/${id}`, { method: "DELETE" }),
  setTags: (id: string, tagIds: string[]) =>
    v2ApiFetch<{ success: boolean; data: V2Tag[] }>(
      `/articles/${id}/tags`,
      { method: "PATCH", body: JSON.stringify({ tag_ids: tagIds }) },
    ),
};

// ─── V2: Workflow ──────────────────────────────────────────────────────────

export const v2WorkflowApi = {
  transition: (articleId: string, toStatus: string, comments?: string) =>
    v2ApiFetch<{ success: boolean; data: V2Transition }>(
      `/articles/${articleId}/transition`,
      { method: "POST", body: JSON.stringify({ to_status: toStatus, comments }) },
    ),
  availableTransitions: (articleId: string) =>
    v2ApiFetch<{ success: boolean; data: { current_status: string; available: string[] } }>(
      `/articles/${articleId}/transitions`,
    ),
  history: (articleId: string) =>
    v2ApiFetch<{ success: boolean; data: V2Revision[] }>(
      `/articles/${articleId}/history`,
    ),
  assign: (articleId: string, userId: string) =>
    v2ApiFetch<{ success: boolean }>(
      `/articles/${articleId}/assign`,
      { method: "PATCH", body: JSON.stringify({ assigned_to_id: userId }) },
    ),
  submitFactCheck: (articleId: string, status: string, findings?: string, sources?: string) =>
    v2ApiFetch<{ success: boolean; data: V2FactCheck }>(
      `/articles/${articleId}/fact-check`,
      { method: "POST", body: JSON.stringify({ status, findings, sources_verified: sources }) },
    ),
  getFactChecks: (articleId: string) =>
    v2ApiFetch<{ success: boolean; data: V2FactCheck[] }>(
      `/articles/${articleId}/fact-check`,
    ),
};

// ─── V2: Categories ────────────────────────────────────────────────────────

export const v2CategoriesApi = {
  list: () =>
    v2ApiFetch<{ success: boolean; data: V2Category[] }>("/categories"),
  create: (payload: { name: string; slug: string; icon?: string }) =>
    v2ApiFetch<{ success: boolean; data: V2Category }>(
      "/categories",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  update: (id: string, payload: { name?: string; slug?: string; icon?: string }) =>
    v2ApiFetch<{ success: boolean; data: V2Category }>(
      `/categories/${id}`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),
  delete: (id: string) =>
    v2ApiFetch<{ success: boolean }>(`/categories/${id}`, { method: "DELETE" }),
};

// ─── V2: Tags ──────────────────────────────────────────────────────────────

export const v2TagsApi = {
  list: () =>
    v2ApiFetch<{ success: boolean; data: V2Tag[] }>("/tags"),
  create: (name: string, slug: string) =>
    v2ApiFetch<{ success: boolean; data: V2Tag }>(
      "/tags",
      { method: "POST", body: JSON.stringify({ name, slug }) },
    ),
  delete: (id: string) =>
    v2ApiFetch<{ success: boolean }>(`/tags/${id}`, { method: "DELETE" }),
};

// ─── V2: Dashboard ─────────────────────────────────────────────────────────

export const v2DashboardApi = {
  stats: () =>
    v2ApiFetch<{ success: boolean; data: V2DashboardStats }>("/dashboard/stats"),
  pipeline: () =>
    v2ApiFetch<{ success: boolean; data: V2PipelineStats }>("/dashboard/pipeline"),
  myAssignments: () =>
    v2ApiFetch<{ success: boolean; data: V2Assignment[] }>("/dashboard/my-assignments"),
};

// ─── V2: Audit ─────────────────────────────────────────────────────────────

export const v2AuditApi = {
  list: (params: { page?: number; limit?: number; action?: string; resource_type?: string; user_id?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.action) qs.set("action", params.action);
    if (params.resource_type) qs.set("resource_type", params.resource_type);
    if (params.user_id) qs.set("user_id", params.user_id);
    return v2ApiFetch<{ success: boolean; data: PaginatedResponse<V2AuditLog> }>(
      `/audit?${qs.toString()}`,
    );
  },
  actions: () =>
    v2ApiFetch<{ success: boolean; data: string[] }>("/audit/actions"),
};

// ─── V2: Notifications (Editorial) ─────────────────────────────────────────

export const v2NotificationsApi = {
  list: (params: { page?: number; limit?: number; unread_only?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.unread_only) qs.set("unread_only", "true");
    return v2ApiFetch<{ success: boolean; data: PaginatedResponse<V2EditorialNotification> & { unread_count: number } }>(
      `/notifications?${qs.toString()}`,
    );
  },
  unreadCount: () =>
    v2ApiFetch<{ success: boolean; data: { unread_count: number } }>("/notifications/unread-count"),
  markRead: (ids?: string[]) =>
    v2ApiFetch<{ success: boolean }>(
      "/notifications/read",
      { method: "PATCH", body: JSON.stringify({ notification_ids: ids || null }) },
    ),
  markAllRead: () =>
    v2ApiFetch<{ success: boolean }>("/notifications/read-all", { method: "PATCH" }),
};

// ─── V2: Media ─────────────────────────────────────────────────────────────

export const v2MediaApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    // --- SEC FIX SEC-007 ---
    const res = await fetch(`${V2_BASE}/media/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error?.detail ?? `Upload failed ${res.status}`);
    }
    return res.json() as Promise<{ success: boolean; data: V2MediaUpload }>;
  },
};

// ─── V2: Users ─────────────────────────────────────────────────────────────

export const v2UsersApi = {
  list: (params: { page?: number; limit?: number; search?: string; role?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    return v2ApiFetch<{ success: boolean; data: PaginatedResponse<V2User> }>(
      `/users?${qs.toString()}`,
    );
  },
  create: (body: { name: string; email: string; password: string; is_admin?: boolean; is_active?: boolean; role_ids?: string[] }) =>
    v2ApiFetch<{ success: boolean; data: V2User }>(
      "/users",
      { method: "POST", body: JSON.stringify(body) },
    ),
  update: (userId: string, body: { name?: string; email?: string; password?: string; is_admin?: boolean; is_active?: boolean }) =>
    v2ApiFetch<{ success: boolean; data: V2User }>(
      `/users/${userId}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  updateStatus: (userId: string, body: { is_active: boolean }) =>
    v2ApiFetch<{ success: boolean; data: V2User }>(
      `/users/${userId}/status`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  delete: (userId: string) =>
    v2ApiFetch<{ success: boolean }>(
      `/users/${userId}`,
      { method: "DELETE" },
    ),
  assignRoles: (userId: string, roleIds: string[]) =>
    v2ApiFetch<{ success: boolean; data: V2User }>(
      `/users/${userId}/roles`,
    ),
};

// ─── V2: Developers (Admin) ────────────────────────────────────────────────

export const v2DevelopersAdminApi = {
  list: (params: { page?: number; limit?: number; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    return v2ApiFetch<{ success: boolean; data: PaginatedResponse<import("./types").DeveloperAdmin> }>(
      `/admin/developers?${qs.toString()}`,
    );
  },
  get: (id: string) =>
    v2ApiFetch<{ success: boolean; data: import("./types").DeveloperAdmin }>(
      `/admin/developers/${id}`,
    ),
  updateStatus: (id: string, body: { is_active: boolean }) =>
    v2ApiFetch<{ success: boolean; data: import("./types").DeveloperAdmin }>(
      `/admin/developers/${id}/status`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  update: (id: string, body: Partial<import("./types").DeveloperAdmin>) =>
    v2ApiFetch<{ success: boolean; data: import("./types").DeveloperAdmin }>(
      `/admin/developers/${id}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  delete: (id: string) =>
    v2ApiFetch<{ success: boolean }>(
      `/admin/developers/${id}`,
      { method: "DELETE" },
    ),
};

// ─── V2: Roles ─────────────────────────────────────────────────────────────

export const v2RolesApi = {
  list: () =>
    v2ApiFetch<{ success: boolean; data: V2Role[] }>("/roles"),
  permissions: () =>
    v2ApiFetch<{ success: boolean; data: V2Permission[] }>("/roles/permissions"),
  create: (payload: { name: string; description?: string | null; permission_ids: string[] }) =>
    v2ApiFetch<{ success: boolean; data: V2Role }>(
      "/roles",
      { method: "POST", body: JSON.stringify(payload) },
    ),
};

// ─── V2: System ────────────────────────────────────────────────────────────

export const v2ApiHealth = () =>
  v2ApiFetch<{ success: boolean; data: V2HealthStatus }>("/system/health");

export const v2SystemSettings = () =>
  v2ApiFetch<{ success: boolean; data: V2SystemSettings }>("/system/settings");

// ─── V2: API Keys ──────────────────────────────────────────────────────────

export const v2ApiKeys = {
  list: () =>
    v2ApiFetch<{ success: boolean; data: V2ApiKey[] }>("/api-keys"),
  create: (name: string, rateLimit?: number, expiresAt?: string) =>
    v2ApiFetch<{ success: boolean; data: V2ApiKeyCreated }>(
      "/api-keys",
      { method: "POST", body: JSON.stringify({ name, rate_limit: rateLimit, expires_at: expiresAt }) },
    ),
  revoke: (id: string) =>
    v2ApiFetch<{ success: boolean }>(`/api-keys/${id}`, { method: "DELETE" }),
  rotate: (id: string) =>
    v2ApiFetch<{ success: boolean; data: V2ApiKeyCreated }>(
      `/api-keys/${id}/rotate`,
      { method: "POST" },
    ),
  // Self-service: any authenticated user can manage their own keys
  listMyKeys: () =>
    v2ApiFetch<{ success: boolean; data: V2ApiKey[] }>("/api-keys/my"),
  createMyKey: () =>
    v2ApiFetch<{ success: boolean; message: string; data: V2ApiKeyCreated }>(
      "/api-keys/my",
      { method: "POST" },
    ),
};
