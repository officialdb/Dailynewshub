/** TypeScript types matching the backend Pydantic schemas. */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
  country?: string | null;
  state?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  source_name: string | null;
  source_url: string;
  author: string | null;
  category_id: string;
  is_featured: boolean;
  is_trending: boolean;
  is_pinned: boolean;
  view_count: number;
  location?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface DeveloperRegisterRequest {
  name: string;
  email: string;
  password: string;
  company_name?: string | null;
  website?: string | null;
  what_are_you_building?: string | null;
}

export interface DeveloperLoginRequest {
  email: string;
  password: string;
}

export interface DeveloperResponse {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  website: string | null;
  tier: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface DeveloperTokenResponse {
  // --- SEC FIX SEC-007 ---
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  developer: DeveloperResponse;
}

export interface DeveloperAdmin {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  website: string | null;
  what_are_you_building: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  tier: string;
  created_at: string;
  updated_at: string;
}

export interface DeveloperProfileUpdateRequest {
  name?: string | null;
  company_name?: string | null;
  website?: string | null;
  what_are_you_building?: string | null;
}

export interface AuthData {
  user: User;
  tokens: TokenResponse;
}

export interface Analytics {
  total_users: number;
  total_articles: number;
  total_bookmarks?: number;
  total_notifications?: number;
  total_reels?: number;
  new_users_this_week?: number;
  new_users_today?: number;
  articles_today?: number;
  articles_per_category?: { category: string; count: number }[];
  most_bookmarked_articles?: { article_id: string; title: string; bookmark_count: number }[];
}

export interface RecentActivity {
  recent_users: { id: string; name: string; email: string; created_at: string }[];
  recent_articles: { id: string; title: string; source_name: string | null; created_at: string }[];
  recent_comments: { id: string; body: string; article_title: string | null; user_name: string; created_at: string }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  article_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  slug: string;
  icon?: string;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  icon?: string;
}

export interface Reel {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  channel_id: string;
  channel_name: string;
  channel_logo_url: string | null;
  category_id: string | null;
  duration_seconds: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  aspect_ratio: string;
  published_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  article_id: string | null;
  article_title: string | null;
  sent_at: string | null;
  scheduled_at: string | null;
  is_sent: boolean;
  created_at: string;
}

export interface NotificationSend {
  title: string;
  body: string;
  article_id?: string;
  segment?: string;
}

export interface NotificationSchedule extends NotificationSend {
  scheduled_at: string;
}

export interface Comment {
  id: string;
  body: string;
  article_id: string;
  article_title: string | null;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  is_admin?: boolean;
  is_active?: boolean;
  avatar_url?: string;
  country?: string | null;
  state?: string | null;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  is_active?: boolean;
  is_admin?: boolean;
  password?: string;
  country?: string;
  state?: string;
}

export interface ArticleCreate {
  title: string;
  description?: string;
  content?: string;
  image_url?: string;
  source_name?: string;
  source_url: string;
  author?: string;
  category_id: string;
  is_featured?: boolean;
  is_trending?: boolean;
  location?: string;
  location_state?: string;
  location_country?: string;
  published_at?: string;
}

export interface ArticleUpdate {
  title?: string;
  description?: string;
  content?: string;
  image_url?: string;
  source_name?: string;
  source_url?: string;
  author?: string;
  category_id?: string;
  is_featured?: boolean;
  is_trending?: boolean;
  is_pinned?: boolean;
  location?: string;
  location_state?: string;
  location_country?: string;
  published_at?: string;
}

// ─── V2 NMS Types ──────────────────────────────────────────────────────────

export interface V2Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: V2Permission[];
}

export interface V2Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface V2User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
  country?: string | null;
  state?: string | null;
  roles: { id: string; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface V2AuthData {
  user: V2User;
  // --- SEC FIX SEC-007 ---
  tokens?: TokenResponse;
}

export interface V2Workflow {
  status: string;
  assigned_to_id: string | null;
  submitted_at: string | null;
  published_at: string | null;
}

export interface V2Article {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  source_name: string | null;
  source_url: string | null;
  author: string | null;
  category_id: string;
  is_featured: boolean;
  is_trending: boolean;
  is_pinned: boolean;
  view_count: number;
  location?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  status: string;
  reporter_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  reporter: { id: string; name: string; email: string } | null;
  category: { id: string; name: string; slug: string } | null;
  workflow: V2Workflow | null;
  tags?: V2Tag[];
}

export interface V2ArticleCreate {
  title: string;
  description?: string;
  content?: string;
  image_url?: string;
  source_name?: string;
  source_url?: string;
  author?: string;
  category_id: string;
  location?: string;
  location_state?: string;
  location_country?: string;
}

export interface V2ArticleUpdate {
  title?: string;
  description?: string;
  content?: string;
  image_url?: string;
  source_name?: string;
  source_url?: string;
  author?: string;
  category_id?: string;
  is_featured?: boolean;
  is_trending?: boolean;
  is_pinned?: boolean;
  location?: string;
  location_state?: string;
  location_country?: string;
}

export interface V2Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  article_count?: number;
  created_at: string;
  updated_at: string;
}

export interface V2Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface V2Transition {
  article_id: string;
  from_status: string;
  to_status: string;
  reviewer_id: string;
  comments: string | null;
  created_at: string;
}

export interface V2Revision {
  id: string;
  workflow_id: string;
  reviewer_id: string;
  action: string;
  from_status: string;
  to_status: string;
  comments: string | null;
  created_at: string;
}

export interface V2FactCheck {
  id: string;
  workflow_id: string;
  checker_id: string;
  status: string;
  findings: string | null;
  sources_verified: string | null;
  created_at: string;
  updated_at: string;
}

export interface V2StatusCount {
  status: string;
  count: number;
}

export interface V2DashboardStats {
  total_articles: number;
  total_users: number;
  total_api_keys: number;
  by_status: V2StatusCount[];
}

export interface V2PipelineStage {
  status: string;
  count: number;
  label: string;
}

export interface V2PipelineStats {
  stages: V2PipelineStage[];
  total_in_pipeline: number;
}

export interface V2Assignment {
  article_id: string;
  title: string;
  status: string;
  category_name: string | null;
  assigned_at: string | null;
}

export interface V2AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface V2EditorialNotification {
  id: string;
  event_type: string;
  title: string;
  message: string;
  article_id: string | null;
  actor_name: string | null;
  is_read: boolean;
  created_at: string;
}

export interface V2MediaUpload {
  url: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export interface V2HealthStatus {
  status: string;
  database: string;
  redis: string;
  version: string;
}

export interface V2SystemSettings {
  app_name: string;
  version: string;
  max_upload_size_mb: number;
  allowed_image_types: string[];
  default_rate_limit: number;
  workflow_states: string[];
  system_roles: string[];
}

export interface V2ApiKey {
  id: string;
  prefix: string;
  name: string;
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/** Returned only once on key creation — contains the full plaintext key */
export interface V2ApiKeyCreated extends V2ApiKey {
  key: string;
}

export interface DeveloperApiKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  environment: string;
  tier: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface DeveloperApiKeyCreatedResponse {
  id: string;
  name: string;
  key_prefix: string;
  raw_key: string;
  environment: string;
  tier: string;
  created_at: string;
}

export interface DeveloperAppResponse {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  api_keys: DeveloperApiKeyResponse[];
  created_at: string;
}

export interface CreateDeveloperAppRequest {
  name: string;
  description?: string | null;
}

export interface UpdateDeveloperAppRequest {
  name?: string | null;
  description?: string | null;
}

export interface CreateDeveloperApiKeyRequest {
  name: string;
  environment?: "live" | "test";
  expires_at?: string | null;
}

export interface UsageStatsResponse {
  today_requests: number;
  today_limit: number;
  today_remaining: number;
  month_requests: number;
  month_limit: number;
  success_rate: number;
  avg_response_time_ms: number;
}

export interface DailyUsagePoint {
  date: string;
  request_count: number;
  success_count: number;
  error_count: number;
}

export interface UsageHistoryResponse {
  data: DailyUsagePoint[];
  api_key_id: string | null;
  period_days: number;
}

export interface TopEndpointResponse {
  endpoint: string;
  request_count: number;
  avg_response_time_ms: number;
  error_rate: number;
}

export interface PublicArticleResponse {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  author: string | null;
  source_name: string | null;
  category: string | null;
  published_at: string | null;
  view_count?: number;
  ai_summary?: string | null;
}

export interface PublicReelResponse {
  id: string;
  title: string;
  youtube_video_id: string;
  thumbnail_url: string | null;
  channel_name: string;
  category: string | null;
  duration_seconds: number;
  view_count: number;
  like_count: number;
  published_at: string | null;
  aspect_ratio: string;
}
