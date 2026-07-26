/** TypeScript types matching the backend Pydantic schemas. */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
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
  view_count: number;
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
}

export interface UserUpdate {
  name?: string;
  email?: string;
  is_active?: boolean;
  is_admin?: boolean;
  password?: string;
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
  published_at?: string;
}
