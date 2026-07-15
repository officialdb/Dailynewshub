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
  total_notifications: number;
  new_users_today: number;
  articles_today: number;
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
